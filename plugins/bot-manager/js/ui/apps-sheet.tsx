import { getAssetIdByName } from '@revenge-mod/assets'
import { Design } from '@revenge-mod/discord/design'
import { React } from '@revenge-mod/react'
import { fetchIntegrations, readApps } from '../lib/api'
import { copy } from '../lib/toast'
import type { AppInfo } from '../lib/api'

type State =
	| { status: 'loading' }
	| { status: 'ready'; apps: AppInfo[]; raw: string }
	| { status: 'error'; message: string }

const describe = (app: AppInfo) =>
	[
		app.addedBy ? `Added by ${app.addedBy}` : undefined,
		app.addedAt ? new Date(app.addedAt).toLocaleDateString() : undefined,
		app.verified ? 'Verified' : undefined,
		app.commands ? 'Commands' : undefined,
	]
		.filter(Boolean)
		.join(' • ')

function CopyRow(props: { label: string; subLabel?: string; text: string; message: string }) {
	const id = getAssetIdByName('CopyIcon')

	return (
		<Design.ActionSheetRow
			label={props.label}
			subLabel={props.subLabel}
			icon={id ? <Design.ActionSheetRow.Icon source={id} /> : undefined}
			onPress={() => copy(props.text, props.message)}
		/>
	)
}

/** Bottom sheet listing the apps installed in a server. Tap an app to copy its ID. */
export default function AppsSheet({ guildId }: { guildId: string }) {
	const [state, setState] = React.useState<State>({ status: 'loading' })

	React.useEffect(() => {
		let alive = true

		fetchIntegrations(guildId)
			.then(body => {
				if (!alive) return
				setState({
					status: 'ready',
					apps: readApps(body),
					raw: JSON.stringify(body, null, 1),
				})
			})
			.catch((error: any) => {
				if (alive) setState({ status: 'error', message: String(error?.message ?? error) })
			})

		return () => {
			alive = false
		}
	}, [guildId])

	const Header = Design.BottomSheetTitleHeader as any

	return (
		<Design.ActionSheet>
			<Header title="Bots and Apps" />

			{state.status === 'loading' && (
				<Design.ActionSheetRow.Group>
					<Design.ActionSheetRow label="Loading..." />
				</Design.ActionSheetRow.Group>
			)}

			{state.status === 'error' && (
				<Design.ActionSheetRow.Group>
					<Design.ActionSheetRow label="Could not load apps" subLabel={state.message} />
					<CopyRow
						label="Copy error"
						text={state.message}
						message="Error copied"
					/>
				</Design.ActionSheetRow.Group>
			)}

			{state.status === 'ready' && (
				<>
					<Design.ActionSheetRow.Group>
						{state.apps.length === 0 ? (
							<Design.ActionSheetRow label="No apps found" />
						) : (
							state.apps.map(app => (
								<CopyRow
									key={app.id}
									label={app.name}
									subLabel={describe(app) || app.id}
									text={app.id}
									message={`${app.name} ID copied`}
								/>
							))
						)}
					</Design.ActionSheetRow.Group>

					<Design.ActionSheetRow.Group>
						<CopyRow
							label="Copy raw response (debug)"
							text={state.raw}
							message="Raw response copied"
						/>
					</Design.ActionSheetRow.Group>
				</>
			)}
		</Design.ActionSheet>
	)
}
