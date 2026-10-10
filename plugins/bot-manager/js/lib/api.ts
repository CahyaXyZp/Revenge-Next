import { lookupModule } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'

type RestAPI = {
	get(options: {
		url: string
		query?: Record<string, unknown>
	}): Promise<{ body: unknown }>
}

let rest: RestAPI | undefined

/** Finds Discord's own REST client, so requests carry the user's session. */
function getRest(): RestAPI {
	if (rest) return rest

	const [module] = lookupModule(withProps<RestAPI>('getAPIBaseURL', 'get'))
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

export type AppInfo = {
	id: string
	name: string
	addedBy?: string
	addedAt?: string
	verified: boolean
	commands: boolean
}

type Loose = Record<string, any>

/**
 * Turns the integrations response into a list of apps.
 *
 * The exact shape is not documented, so this accepts a plain array or an object with
 * `integrations` and `applications`, and skips entries that are not bots or apps.
 */
export function readApps(body: unknown): AppInfo[] {
	const data = body as Loose | Loose[] | undefined
	const integrations: Loose[] = Array.isArray(data)
		? data
		: (data?.integrations ?? [])
	const applications: Loose[] = Array.isArray(data) ? [] : (data?.applications ?? [])

	const apps = new Map<string, AppInfo>()

	for (const item of integrations) {
		const application = item.application
		if (!application && item.type !== 'discord') continue

		const id = String(application?.id ?? item.id)
		apps.set(id, {
			id,
			name: String(application?.name ?? item.name ?? id),
			addedBy: item.user?.global_name ?? item.user?.username,
			addedAt: item.synced_at ?? item.created_at,
			verified: Boolean(application?.verified ?? application?.is_verified),
			commands: Boolean(item.command_count ?? application?.command_count),
		})
	}

	for (const application of applications) {
		const id = String(application.id)
		if (apps.has(id)) continue

		apps.set(id, {
			id,
			name: String(application.name ?? id),
			verified: Boolean(application.verified ?? application.is_verified),
			commands: Boolean(application.command_count),
		})
	}

	return [...apps.values()].sort((a, b) => a.name.localeCompare(b.name))
}
