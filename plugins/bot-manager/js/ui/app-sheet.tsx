import { getAssetIdByName } from '@revenge-mod/assets'
import { Design } from '@revenge-mod/discord/design'
import { formatDate } from '../lib/api'
import { copy } from '../lib/toast'
import type { AppInfo } from '../lib/api'

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

/** Details of one app. Every row copies its value. */
export default function AppSheet({ app }: { app: AppInfo }) {
	const Header = Design.BottomSheetTitleHeader as any

	return (
		<Design.ActionSheet>
			<Header title={app.name} />

			<Design.ActionSheetRow.Group>
				<CopyRow
					label="Copy App ID"
					subLabel={app.id}
					text={app.id}
					message="App ID copied"
				/>
				{app.botId && app.botId !== app.id && (
					<CopyRow
						label="Copy Bot User ID"
						subLabel={app.botId}
						text={app.botId}
						message="Bot ID copied"
					/>
				)}
				<CopyRow
					label="Copy Invite Link"
					subLabel="Adds the app to a server"
					text={`https://discord.com/oauth2/authorize?client_id=${app.id}&scope=${app.scopes.length ? app.scopes.join('%20') : 'bot%20applications.commands'}`}
					message="Invite link copied"
				/>
			</Design.ActionSheetRow.Group>

			<Design.ActionSheetRow.Group>
				<Design.ActionSheetRow
					label="Added by"
					subLabel={`${app.addedBy ?? 'Unknown'}${app.addedAt ? `, ${formatDate(app.addedAt)}` : ''}`}
				/>
				<Design.ActionSheetRow
					label="Scopes"
					subLabel={app.scopes.length ? app.scopes.join(', ') : 'Unknown'}
				/>
				<CopyRow
					label="Copy raw data (debug)"
					text={JSON.stringify(app.raw, null, 1)}
					message="Raw data copied"
				/>
			</Design.ActionSheetRow.Group>
		</Design.ActionSheet>
	)
}
