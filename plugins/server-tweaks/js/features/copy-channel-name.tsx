import { getAssetIdByName } from '@revenge-mod/assets'
import {
	ActionSheetActionCreators,
	ToastActionCreators,
} from '@revenge-mod/discord/actions'
import { Design } from '@revenge-mod/discord/design'
import { Stores } from '@revenge-mod/discord/flux'
import { Clipboard } from '@revenge-mod/externals/react-native-clipboard'
import { lookupGeneratedIconComponent } from '@revenge-mod/utils/discord'
import { registerActionSheetPatch } from '../patches/actionsheet'
import type { Cleanup } from '../patches/actionsheet'
import type { ReactElement } from 'react'

/**
 * Adds "Copy Channel Name" to the channel long-press menu.
 *
 * Covers text, voice, announcement and other server channels (`ChannelLongPress...`),
 * threads (`ThreadLongPressActionSheet`) and forum posts (`ForumPostLongPressActionSheet`).
 */

const GROUP_KEY = 'server-tweaks-copy-channel-name'

type ChannelLike = { name?: string | null }
type ChannelStoreLike = { getChannel(id: string): ChannelLike | undefined }

type ChannelSheetProps = { channelId: string }
type ForumPostSheetProps = { thread: ChannelLike }

function copyToClipboard(name: string) {
	Clipboard.setString(name)

	ToastActionCreators.open({
		key: 'SERVER_TWEAKS_CHANNEL_NAME_COPIED',
		content: 'Channel name copied',
		IconComponent: lookupGeneratedIconComponent('CopyIcon'),
	})
}

function addRow(groups: ReactElement[], name: string | null | undefined) {
	// DMs have no name. Skip them rather than copying an empty string.
	if (!name) return

	// Sheets can re-render, so make sure the row is only added once.
	if (groups.some(group => group?.key === GROUP_KEY)) return

	groups.push(
		<Design.ActionSheetRow.Group key={GROUP_KEY}>
			<Design.ActionSheetRow
				label="Copy Channel Name"
				icon={
					<Design.ActionSheetRow.Icon source={getAssetIdByName('CopyIcon')!} />
				}
				onPress={() => {
					copyToClipboard(name)
					ActionSheetActionCreators.hideActionSheet()
				}}
			/>
		</Design.ActionSheetRow.Group>,
	)
}

export function registerCopyChannelName(cleanup: Cleanup) {
	const channelName = (channelId: string) =>
		(Stores.ChannelStore as unknown as ChannelStoreLike).getChannel(channelId)
			?.name

	cleanup(
		registerActionSheetPatch<ChannelSheetProps>(
			/^ChannelLongPress/,
			(groups, props) => addRow(groups, channelName(props.channelId)),
		),
	)

	cleanup(
		registerActionSheetPatch<ChannelSheetProps>(
			'ThreadLongPressActionSheet',
			(groups, props) => addRow(groups, channelName(props.channelId)),
		),
	)

	cleanup(
		registerActionSheetPatch<ForumPostSheetProps>(
			'ForumPostLongPressActionSheet',
			(groups, props) => addRow(groups, props.thread?.name),
		),
	)
}
