import { ActionSheetActionCreators } from '@revenge-mod/discord/actions'
import { Design } from '@revenge-mod/discord/design'
import { React, ReactNative } from '@revenge-mod/react'
import { fetchIntegrations, formatDate, readApps } from '../lib/api'
import AppSheet from './app-sheet'
import type { AppInfo } from '../lib/api'

type State =
	| { status: 'loading' }
	| { status: 'ready'; apps: AppInfo[] }
	| { status: 'error'; message: string }

const subLabel = (app: AppInfo) =>
	[
		app.addedAt
			? `Added on ${formatDate(app.addedAt)}${app.addedBy ? ` by ${app.addedBy}` : ''}`
			: undefined,
		[app.verified ? 'Verified Bot' : undefined, app.commands ? 'Commands' : undefined]
			.filter(Boolean)
			.join(' • ') || undefined,
	]
		.filter(Boolean)
		.join('\n')

const manage = (app: AppInfo) =>
	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: AppSheet }),
		'BotManagerApp',
		{ app },
	)

/**
 * The "Bots and Apps" section of Server Settings > Integrations: a search field and one row
 * per installed app. Tap a row to manage the app.
 */
export default function AppsSection({ guildId }: { guildId: string }) {
	const { Image, View } = ReactNative
	const [state, setState] = React.useState<State>({ status: 'loading' })
	const [query, setQuery] = React.useState('')

	React.useEffect(() => {
		let alive = true

		fetchIntegrations(guildId)
			.then(body => {
				if (alive) setState({ status: 'ready', apps: readApps(body) })
			})
			.catch((error: any) => {
				if (alive)
					setState({ status: 'error', message: String(error?.message ?? error) })
			})

		return () => {
			alive = false
		}
	}, [guildId])

	const Text = Design.Text as any
	const TextInput = Design.TextInput as any

	const apps =
		state.status === 'ready'
			? state.apps.filter(app =>
					app.name.toLowerCase().includes(query.trim().toLowerCase()),
				)
			: []

	return (
		<View style={{ marginTop: 24, gap: 12 }}>
			<Text variant="heading-lg/bold">Bots and Apps</Text>

			<TextInput
				placeholder="Search installed apps"
				value={query}
				isClearable
				onChange={(value: any) =>
					setQuery(typeof value === 'string' ? value : (value?.nativeEvent?.text ?? ''))
				}
			/>

			<Design.TableRowGroup>
				{state.status === 'loading' && <Design.TableRow label="Loading apps..." />}

				{state.status === 'error' && (
					<Design.TableRow label="Could not load apps" subLabel={state.message} />
				)}

				{state.status === 'ready' && apps.length === 0 && (
					<Design.TableRow label="No apps found" />
				)}

				{apps.map(app => (
					<Design.TableRow
						key={app.id}
						label={app.name}
						subLabel={subLabel(app)}
						icon={
							app.iconUrl ? (
								<Image
									source={{ uri: app.iconUrl }}
									style={{ width: 40, height: 40, borderRadius: 20 }}
								/>
							) : undefined
						}
						arrow
						onPress={() => manage(app)}
					/>
				))}
			</Design.TableRowGroup>
		</View>
	)
}
