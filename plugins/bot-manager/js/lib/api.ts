import { lookupModule } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'

type RequestOptions = { url: string; query?: Record<string, unknown> }

type RestAPI = {
	get(options: RequestOptions): Promise<{ body: unknown }>
	del(options: RequestOptions): Promise<{ body: unknown }>
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

export type Result<T = any> = { ok: true; body: T } | { ok: false; error: string }

/** Runs a request and returns the outcome as a value. Never throws. */
async function call(
	method: 'get' | 'del',
	options: RequestOptions,
): Promise<Result> {
	try {
		const response = await getRest()[method](options)
		return { ok: true, body: response.body }
	} catch (error: any) {
		const status = error?.status ? `${error.status}: ` : ''
		const message =
			error?.body?.message ?? error?.message ?? error?.text ?? JSON.stringify(error)

		return { ok: false, error: `${status}${String(message).slice(0, 200)}` }
	}
}

export const fetchRoles = (guildId: string) => call('get', { url: `/guilds/${guildId}/roles` })

export const fetchCommandIndex = (guildId: string) =>
	call('get', { url: `/guilds/${guildId}/application-command-index` })

export const fetchCommandPermissions = (guildId: string, appId: string) =>
	call('get', { url: `/applications/${appId}/guilds/${guildId}/commands/permissions` })

export const fetchWebhooks = (guildId: string) =>
	call('get', { url: `/guilds/${guildId}/webhooks` })

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
