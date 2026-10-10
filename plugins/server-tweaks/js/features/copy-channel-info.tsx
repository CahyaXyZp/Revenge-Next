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
import { ROW_KEY_PREFIX, addRowsToSheet } from '../patches/add-rows'
import type { Cleanup } from '../patches/actionsheet'
import type { ReactElement } from 'react'

/**
 * Adds copy rows to the channel long-press menu, next to Discord's own "Copy Channel ID":
 *
 * - "Copy Channel Name" for text, announcement, forum and other channels
 * - "Copy Voice Name" for voice and stage channels
 * - "Copy Category Name" for categories
 * - "Copy Channel Description" for channels that have a topic
 *
 * Covers server channels (`ChannelLongPress...`), threads (`ThreadLongPressActionSheet`) and
 * forum posts (`ForumPostLongPressActionSheet`).
 */

// Channel types, from Discord's API.
const GUILD_VOICE = 2
const GUILD_CATEGORY = 4
const GUILD_STAGE_VOICE = 13

type ChannelLike = { name?: string | null; topic?: string | null; type?: number }
type ChannelStoreLike = { getChannel(id: string): ChannelLike | undefined }

type ChannelSheetProps = { channelId: string }
type ForumPostSheetProps = { thread: ChannelLike }

function copy(text: string, message: string) {
	Clipboard.setString(text)

	ToastActionCreators.open({
		key: 'SERVER_TWEAKS_COPIED',
		content: message,
		IconComponent: lookupGeneratedIconComponent('CopyIcon'),
	})
}

function makeRow(id: string, label: string, text: string, message: string) {
	return (
		<Design.ActionSheetRow
			key={`${ROW_KEY_PREFIX}${id}`}
			label={label}
			icon={<Design.ActionSheetRow.Icon source={getAssetIdByName('CopyIcon')!} />}
			onPress={() => {
				copy(text, message)
				ActionSheetActionCreators.hideActionSheet()
			}}
		/>
	)
}

function channelRows(channel: ChannelLike | undefined): ReactElement[] {
	// DMs have no name. Skip them rather than copying an empty string.
	if (!channel?.name) return []

	const isVoice =
		channel.type === GUILD_VOICE || channel.type === GUILD_STAGE_VOICE
	const isCategory = channel.type === GUILD_CATEGORY

	const rows: ReactElement[] = []

	if (isCategory) {
		rows.push(
			makeRow('name', 'Copy Category Name', channel.name, 'Category name copied'),
		)
	} else if (isVoice) {
		rows.push(makeRow('name', 'Copy Voice Name', channel.name, 'Voice name copied'))
	} else {
		rows.push(
			makeRow('name', 'Copy Channel Name', channel.name, 'Channel name copied'),
		)
	}

	const topic = channel.topic?.trim()
	if (topic && !isVoice && !isCategory) {
		rows.push(
			makeRow(
				'description',
				'Copy Channel Description',
				channel.topic as string,
				'Channel description copied',
			),
		)
	}

	return rows
}

export function registerCopyChannelInfo(cleanup: Cleanup) {
	const channel = (channelId: string) =>
		(Stores.ChannelStore as unknown as ChannelStoreLike).getChannel(channelId)

	cleanup(
		registerActionSheetPatch<ChannelSheetProps>(
			/^ChannelLongPress/,
			(groups, props) => addRowsToSheet(groups, channelRows(channel(props.channelId))),
		),
	)

	cleanup(
		registerActionSheetPatch<ChannelSheetProps>(
			'ThreadLongPressActionSheet',
			(groups, props) => addRowsToSheet(groups, channelRows(channel(props.channelId))),
		),
	)

	cleanup(
		registerActionSheetPatch<ForumPostSheetProps>(
			'ForumPostLongPressActionSheet',
			(groups, props) => addRowsToSheet(groups, channelRows(props.thread)),
		),
	)
}
