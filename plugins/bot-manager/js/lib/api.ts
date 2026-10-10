import { lookupModule } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'

type RequestOptions = { url: string; query?: Record<string, unknown>; body?: unknown }

type RestAPI = {
	get(options: RequestOptions): Promise<{ body: unknown }>
	del(options: RequestOptions): Promise<{ body: unknown }>
	put(options: RequestOptions): Promise<{ body: unknown }>
}

let rest: RestAPI | undefined

/** Finds Discord's own REST client, so requests carry the user's session. */
function getRest(): RestAPI {
	if (rest) return rest

	const [module] = lookupModule(withProps<RestAPI>('getAPIBaseURL', 'get', 'del'))
	if (!module) throw new Error('Discord REST module not found')

	return (rest = module)
}

/** Raw response of `GET /guilds/{id}/integrations` with applications included. */
export async function fetchIntegrations(guildId: string): Promise<unknown> {
	const response = await getRest().get({
		url: `/guilds/${guildId}/integrations`,
		query: { include_applications: true },
	})

	return response.body
}

export type Result<T = any> =
	| { ok: true; body: T }
	| { ok: false; error: string; retryAfter?: number }

/** Runs a request and returns the outcome as a value. Never throws. */
async function call(
	method: 'get' | 'del' | 'put',
	options: RequestOptions,
): Promise<Result> {
	try {
		const response = await getRest()[method](options)
		return { ok: true, body: response.body }
	} catch (error: any) {
		const status = error?.status ? `${error.status}: ` : ''
		const message =
			error?.body?.message ?? error?.message ?? error?.text ?? JSON.stringify(error)

		const retryAfter = Number(error?.body?.retry_after)

		return {
			ok: false,
			error: `${status}${String(message).slice(0, 200)}`,
			retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
		}
	}
}

export const fetchRoles = (guildId: string) => call('get', { url: `/guilds/${guildId}/roles` })

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Like `call`, but waits and retries when Discord answers 429 (rate limited). */
async function callRetrying(
	method: 'get' | 'del' | 'put',
	options: RequestOptions,
	attempts = 4,
): Promise<Result> {
	let result = await call(method, options)

	for (let i = 1; i < attempts && !result.ok && result.error.startsWith('429'); i++) {
		const wait = Math.min(Math.max(result.retryAfter ?? 2, 1), 15)
		await sleep(wait * 1000 + 250)
		result = await call(method, options)
	}

	return result
}

const indexCache = new Map<string, { at: number; result: Promise<Result> }>()

/**
 * The command index is rate limited hard, so requests are shared per server, retried on 429 and
 * a good answer is reused for a minute.
 */
export function fetchCommandIndex(guildId: string): Promise<Result> {
	const cached = indexCache.get(guildId)
	if (cached && Date.now() - cached.at < 60_000) return cached.result

	const result = callRetrying('get', {
		url: `/guilds/${guildId}/application-command-index`,
	}).then(r => {
		if (!r.ok) indexCache.delete(guildId)
		return r
	})

	indexCache.set(guildId, { at: Date.now(), result })
	return result
}

export const fetchCommandPermissions = (guildId: string, appId: string) =>
	call('get', { url: `/applications/${appId}/guilds/${guildId}/commands/permissions` })

export const fetchWebhooks = (guildId: string) =>
	call('get', { url: `/guilds/${guildId}/webhooks` })

export type PermissionEntry = { id: string; type: 1 | 2 | 3; permission: boolean }

/**
 * Replaces the permission overrides of one command. Pass the application ID as `commandId` for
 * the app-wide entry (who can use the app's commands, and where).
 */
export const savePermissions = (
	guildId: string,
	appId: string,
	commandId: string,
	permissions: PermissionEntry[],
) =>
	callRetrying('put', {
		url: `/applications/${appId}/guilds/${guildId}/commands/${commandId}/permissions`,
		body: { permissions },
	})

/** Deletes the integration, which also removes the bot from the server. */
export const removeIntegration = (guildId: string, integrationId: string) =>
	call('del', { url: `/guilds/${guildId}/integrations/${integrationId}` })

export type AppInfo = {
	/** Application ID. */
	id: string
	/** ID of the integration, used to remove the app. */
	integrationId: string
	name: string
	iconUrl?: string
	botId?: string
	addedBy?: string
	addedAt?: Date
	scopes: string[]
	verified: boolean
	/** The app has global commands (Discord's "Commands" badge). */
	commands: boolean
	raw: unknown
}

type Loose = Record<string, any>

const DISCORD_EPOCH = 1420070400000
/** Application flag APPLICATION_COMMAND_BADGE. */
const COMMAND_BADGE = 1 << 23

/** Creation time of a snowflake ID. Number precision is plenty for a date. */
const snowflakeDate = (id: string) =>
	new Date(Math.floor(Number(id) / 4194304) + DISCORD_EPOCH)

/**
 * Turns the integrations response into a list of apps.
 *
 * Only integrations of type `discord` that carry an application are apps. The response has no
 * "added on" field, so the date comes from the integration ID.
 */
export function readApps(body: unknown): AppInfo[] {
	const items: Loose[] = Array.isArray(body) ? body : []

	const apps: AppInfo[] = []

	for (const item of items) {
		const application = item.application
		if (item.type !== 'discord' || !application) continue

		const id = String(application.id)
		const icon = application.icon ?? application.bot?.avatar

		apps.push({
			id,
			integrationId: String(item.id),
			name: String(application.name ?? item.name ?? id),
			iconUrl: icon
				? `https://cdn.discordapp.com/${
						application.icon ? 'app-icons' : `avatars`
					}/${application.icon ? id : application.bot?.id}/${icon}.png?size=64`
				: undefined,
			botId: application.bot?.id,
			addedBy: item.user?.global_name ?? item.user?.username,
			addedAt: item.id ? snowflakeDate(String(item.id)) : undefined,
			scopes: Array.isArray(item.scopes) ? item.scopes : [],
			verified: Boolean(application.is_verified),
			commands: ((application.flags ?? 0) & COMMAND_BADGE) !== 0,
			raw: item,
		})
	}

	return apps.sort((a, b) => a.name.localeCompare(b.name))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const formatDate = (date: Date) =>
	`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
