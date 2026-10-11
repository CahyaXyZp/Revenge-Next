import { Design } from '@revenge-mod/discord/design'
import { Stores } from '@revenge-mod/discord/flux'
import { React, ReactNative } from '@revenge-mod/react'
import { savePermissions } from '../lib/api'
import { useBackHandler } from '../lib/back'
import { decrement } from '../lib/permissions'
import { toast } from '../lib/toast'
import Transition from './transition'
import type { PermissionEntry } from '../lib/api'

export type Entry = PermissionEntry & {
	/** A default shown for completeness. It is not saved unless the user changes it. */
	implicit?: boolean
}

export type Names = {
	role(id: string): string
	user(id: string): string
	channel(id: string): string
}

type Props = {
	title: string
	subtitle?: string
	guildId: string
	appId: string
	/** The command's ID, or the application ID for the app-wide entry. */
	commandId: string
	initial: PermissionEntry[]
	/** App-wide editing: @everyone and All Channels always exist and cannot be removed. */
	withDefaults: boolean
	roles: any[]
	names: Names
	/** Discord's own back button closes this page, so no Cancel row is needed. */
	nativeBack: boolean
	onClose: () => void
	onSaved: () => void
}

const GREEN = '#3BA55D'
const RED = '#ED4245'
const MUTED = '#8E9297'

const CHANNEL_TYPES = [0, 2, 5, 13, 15, 16]

export function listChannels(guildId: string): Array<{ id: string; label: string }> {
	try {
		const map = (Stores.ChannelStore as any)?.getMutableGuildChannelsForGuild?.(guildId) ?? {}
		return (Object.values(map) as any[])
			.filter(channel => CHANNEL_TYPES.includes(channel.type))
			.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
			.map(channel => ({ id: String(channel.id), label: `#${channel.name}` }))
	} catch {
		return []
	}
}

function Heading(props: { children: string }) {
	const Text = Design.Text as any
	return (
		<ReactNative.View style={{ marginTop: 20, marginBottom: 8 }}>
			<Text variant="text-md/semibold">{props.children}</Text>
		</ReactNative.View>
	)
}

function Note(props: { children: string }) {
	const Text = Design.Text as any
	return (
		<Text variant="text-sm/medium" color="text-muted">
			{props.children}
		</Text>
	)
}

/** The Deny / Allow buttons at the end of a row. */
export function Choice(props: { allowed: boolean; onChange: (allowed: boolean) => void; onRemove?: () => void }) {
	const { View, Pressable, Text } = ReactNative

	const button = (value: boolean, mark: string, color: string) => (
		<Pressable
			onPress={() => props.onChange(value)}
			hitSlop={6}
			style={{
				width: 34,
				height: 30,
				borderRadius: 6,
				marginLeft: 6,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: props.allowed === value ? color : 'transparent',
				borderWidth: 1,
				borderColor: props.allowed === value ? color : MUTED,
			}}
		>
			<Text style={{ color: props.allowed === value ? '#FFFFFF' : MUTED, fontWeight: '700' }}>{mark}</Text>
		</Pressable>
	)

	return (
		<View style={{ flexDirection: 'row', alignItems: 'center' }}>
			{props.onRemove && (
				<Pressable onPress={props.onRemove} hitSlop={6} style={{ marginRight: 4 }}>
					<Text style={{ color: MUTED, fontSize: 12 }}>Remove</Text>
				</Pressable>
			)}
			{button(false, '✗', RED)}
			{button(true, '✓', GREEN)}
		</View>
	)
}

export type Item = { id: string; type: 1 | 2 | 3; label: string }

/** What can still be added: roles or channels that have no entry yet. */
export function buildItems(
	kind: 'roles' | 'channels',
	entries: Array<{ id: string; type: number }>,
	guildId: string,
	roles: any[],
): Item[] {
	const taken = (type: number) => new Set(entries.filter(entry => entry.type === type).map(entry => entry.id))

	return kind === 'roles'
		? roles
				.filter(role => role.id !== guildId && !taken(1).has(String(role.id)))
				.sort((a, b) => b.position - a.position)
				.map(role => ({ id: String(role.id), type: 1 as const, label: String(role.name) }))
		: listChannels(guildId)
				.filter(channel => !taken(3).has(channel.id))
				.map(channel => ({ ...channel, type: 3 as const }))
}

/** One entry as a row, with its Deny / Allow buttons. */
export function EntryRow(props: {
	label: string
	entry: Entry
	removable: boolean
	onSet: (entry: Entry, allowed: boolean) => void
	onRemove: (entry: Entry) => void
}) {
	const { entry } = props

	return (
		<Design.TableRow
			label={props.label}
			subLabel={entry.permission ? '✓ Allowed' : '✗ Denied'}
			onPress={() => props.onSet(entry, !entry.permission)}
			trailing={
				<Choice
					allowed={entry.permission}
					onChange={allowed => props.onSet(entry, allowed)}
					onRemove={props.removable ? () => props.onRemove(entry) : undefined}
				/>
			}
		/>
	)
}

/** Pick several roles or channels to add. */
export function Picker(props: {
	title: string
	items: Item[]
	nativeBack: boolean
	onAdd: (items: Item[]) => void
	onCancel: () => void
}) {
	useBackHandler(props.onCancel)

	const TextInput = Design.TextInput as any
	const [query, setQuery] = React.useState('')
	const [selected, setSelected] = React.useState<string[]>([])

	const shown = props.items.filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()))

	return (
		<Transition from="right">
		<ReactNative.View style={{ paddingBottom: 48 }}>
			<Heading>{props.title}</Heading>
			<TextInput
				placeholder="Search"
				value={query}
				isClearable
				onChange={(value: any) =>
					setQuery(typeof value === 'string' ? value : (value?.nativeEvent?.text ?? ''))
				}
			/>
			<ReactNative.View style={{ height: 8 }} />
			<Design.TableRowGroup>
				{shown.length === 0 && <Design.TableRow label="Nothing to add" />}
				{shown.map(item => (
					<Design.TableRow
						key={item.id}
						label={item.label}
						subLabel={selected.includes(item.id) ? '✓ Selected' : undefined}
						onPress={() =>
							setSelected(list =>
								list.includes(item.id) ? list.filter(id => id !== item.id) : [...list, item.id],
							)
						}
					/>
				))}
			</Design.TableRowGroup>
			<ReactNative.View style={{ height: 16 }} />
			<Design.TableRowGroup>
				<Design.TableRow
					label={selected.length ? `Add ${selected.length} selected` : 'Add'}
					onPress={() => {
						if (selected.length) props.onAdd(props.items.filter(item => selected.includes(item.id)))
					}}
				/>
				{!props.nativeBack && <Design.TableRow label="Cancel" onPress={props.onCancel} />}
			</Design.TableRowGroup>
		</ReactNative.View>
		</Transition>
	)
}

/** Edits who can use a command (or all of an app's commands), and where. */
export default function PermissionEditor(props: Props) {
	useBackHandler(props.onClose)
	const { View } = ReactNative
	const Text = Design.Text as any
	const everyoneChannels = decrement(props.guildId)

	const [entries, setEntries] = React.useState<Entry[]>(() => {
		const list: Entry[] = props.initial.map(entry => ({ ...entry }))

		if (props.withDefaults) {
			if (!list.some(entry => entry.id === props.guildId))
				list.unshift({ id: props.guildId, type: 1, permission: true, implicit: true })
			if (!list.some(entry => entry.id === everyoneChannels))
				list.push({ id: everyoneChannels, type: 3, permission: true, implicit: true })
		}

		return list
	})
	const [picker, setPicker] = React.useState<'roles' | 'channels' | null>(null)
	const [saving, setSaving] = React.useState(false)

	const isDefault = (entry: Entry) =>
		props.withDefaults && (entry.id === props.guildId || entry.id === everyoneChannels)

	const set = (entry: Entry, permission: boolean) =>
		setEntries(list =>
			list.map(other =>
				other.id === entry.id && other.type === entry.type
					? { ...other, permission, implicit: false }
					: other,
			),
		)

	const remove = (entry: Entry) =>
		setEntries(list => list.filter(other => !(other.id === entry.id && other.type === entry.type)))

	const labelOf = (entry: Entry) =>
		entry.type === 3
			? props.names.channel(entry.id)
			: entry.type === 2
				? props.names.user(entry.id)
				: props.names.role(entry.id)

	const save = async () => {
		setSaving(true)
		const permissions = entries
			.filter(entry => !entry.implicit)
			.map(({ id, type, permission }) => ({ id, type, permission }))

		const result = await savePermissions(props.guildId, props.appId, props.commandId, permissions)
		setSaving(false)

		if (result.ok) {
			toast('Command permissions saved', 'SettingsIcon')
			props.onSaved()
			props.onClose()
		} else {
			toast(`Could not save: ${result.error}`, 'SettingsIcon')
		}
	}

	if (picker) {
		return (
			<Picker
				title={picker === 'roles' ? 'Add Roles' : 'Add Channels'}
				items={buildItems(picker, entries, props.guildId, props.roles)}
				nativeBack={props.nativeBack}
				onCancel={() => setPicker(null)}
				onAdd={chosen => {
					setEntries(list => [
						...list,
						...chosen.map(item => ({ id: item.id, type: item.type, permission: true })),
					])
					setPicker(null)
				}}
			/>
		)
	}

	const roleEntries = entries.filter(entry => entry.type !== 3)
	const channelEntries = entries.filter(entry => entry.type === 3)

	const rows = (list: Entry[]) =>
		list.map(entry => (
			<EntryRow
				key={`${entry.type}-${entry.id}`}
				label={labelOf(entry)}
				entry={entry}
				removable={!isDefault(entry)}
				onSet={set}
				onRemove={remove}
			/>
		))

	return (
		<Transition from="right">
		<View style={{ paddingBottom: 48 }}>
			{!props.nativeBack && (
				<Design.TableRowGroup>
					<Design.TableRow label="Cancel" onPress={props.onClose} />
				</Design.TableRowGroup>
			)}

			<View style={{ marginTop: 20 }}>
				<Text variant="heading-xl/bold">{props.title}</Text>
				{props.subtitle && <Note>{props.subtitle}</Note>}
			</View>

			<Heading>Roles & Members</Heading>
			{roleEntries.length === 0 && <Note>No role or member overrides.</Note>}
			{roleEntries.length > 0 && <Design.TableRowGroup>{rows(roleEntries)}</Design.TableRowGroup>}
			<View style={{ height: 8 }} />
			<Design.TableRowGroup>
				<Design.TableRow label="Add Roles" onPress={() => setPicker('roles')} />
			</Design.TableRowGroup>

			<Heading>Channels</Heading>
			{channelEntries.length === 0 && <Note>No channel overrides.</Note>}
			{channelEntries.length > 0 && <Design.TableRowGroup>{rows(channelEntries)}</Design.TableRowGroup>}
			<View style={{ height: 8 }} />
			<Design.TableRowGroup>
				<Design.TableRow label="Add Channels" onPress={() => setPicker('channels')} />
			</Design.TableRowGroup>

			<View style={{ height: 24 }} />
			<Note>Changes apply to everyone in this server as soon as you save.</Note>
			<View style={{ height: 8 }} />
			<Design.TableRowGroup>
				<Design.TableRow
					label={saving ? 'Saving...' : 'Save'}
					onPress={saving ? undefined : save}
				/>
			</Design.TableRowGroup>
		</View>
		</Transition>
	)
}
