import { getAssetIdByName } from '@revenge-mod/assets'
import { Design } from '@revenge-mod/discord/design'
import { Stores } from '@revenge-mod/discord/flux'
import { React, ReactNative } from '@revenge-mod/react'
import {
	fetchCommandIndex,
	fetchCommandPermissions,
	fetchRoles,
	fetchWebhooks,
	formatDate,
	removeIntegration,
} from '../lib/api'
import { decrement, splitPermissions } from '../lib/permissions'
import { copy, toast } from '../lib/toast'
import PermissionEditor from './permission-editor'
import type { AppInfo, Result } from '../lib/api'

type Props = { app: AppInfo; guildId: string; onBack: () => void }

const GREEN = '#3BA55D'
const RED = '#ED4245'

/** Loads once per app and keeps the outcome as a value. */
function useLoad(load: () => Promise<Result>, deps: unknown[]): Result | undefined {
	const [result, setResult] = React.useState<Result | undefined>()

	React.useEffect(() => {
		let alive = true
		load().then(value => alive && setResult(value))

		return () => {
			alive = false
		}
	}, deps)

	return result
}

/** JSON.stringify replacer: debug info is pasted into bug reports, so webhook secrets stay out. */
function redactSecrets(key: string, value: unknown) {
	return key === 'token' || key === 'url' && typeof value === 'string' && value.includes('/api/webhooks/')
		? '[redacted]'
		: value
}

function Heading(props: { children: string }) {
	const Text = Design.Text as any

	return (
		<ReactNative.View style={{ marginTop: 24, marginBottom: 8 }}>
			<Text variant="heading-lg/bold">{props.children}</Text>
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

const failure = (result: Result | undefined) =>
	result && !result.ok ? result.error : undefined

/** One permission entry as a row: who or where, and whether it is allowed. */
function PermissionRow(props: { label: string; allowed: boolean; note?: string }) {
	return (
		<Design.TableRow
			label={props.label}
			subLabel={`${props.allowed ? '✓ Allowed' : '✗ Denied'}${props.note ? ` ${props.note}` : ''}`}
		/>
	)
}

function PermissionGrid(props: { title: string; names: string[]; color: string; mark: string }) {
	const Text = Design.Text as any
	const { View } = ReactNative

	if (props.names.length === 0) return null

	return (
		<View style={{ marginTop: 12 }}>
			<Text variant="text-md/semibold">{props.title}</Text>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
				{props.names.map(name => (
					<View key={name} style={{ width: '50%', paddingVertical: 4, paddingRight: 8 }}>
						<Text variant="text-sm/medium" style={{ color: props.color }}>
							{`${props.mark} ${name}`}
						</Text>
					</View>
				))}
			</View>
		</View>
	)
}

/** Manage page of one app: command permissions, bot permissions, webhooks and removal. */
export default function ManageApp({ app, guildId, onBack }: Props) {
	const { View, Image } = ReactNative
	const Text = Design.Text as any
	const TextInput = Design.TextInput as any

	const [query, setQuery] = React.useState('')
	const [confirming, setConfirming] = React.useState(false)
	const [removing, setRemoving] = React.useState(false)
	const [editor, setEditor] = React.useState<{ commandId: string; title: string; subtitle?: string } | null>(null)
	const [version, setVersion] = React.useState(0)

	const roles = useLoad(() => fetchRoles(guildId), [guildId])
	const index = useLoad(() => fetchCommandIndex(guildId), [guildId])
	const permissions = useLoad(() => fetchCommandPermissions(guildId, app.id), [guildId, app.id, version])
	const webhooks = useLoad(() => fetchWebhooks(guildId), [guildId])

	const roleList: any[] = roles?.ok && Array.isArray(roles.body) ? roles.body : []
	const roleName = (id: string) =>
		id === guildId ? '@everyone' : (roleList.find(role => role.id === id)?.name ?? `Role ${id}`)

	const userName = (id: string) => {
		const user = (Stores.UserStore as any)?.getUser?.(id)
		return user?.globalName ?? user?.username ?? `User ${id}`
	}

	const channelName = (id: string) => {
		if (id === decrement(guildId)) return 'All Channels'
		const channel = (Stores.ChannelStore as any)?.getChannel?.(id)
		return channel?.name ? `#${channel.name}` : `Channel ${id}`
	}

	const entries: any[] = permissions?.ok && Array.isArray(permissions.body) ? permissions.body : []
	const appEntry = entries.find(entry => entry.id === app.id)
	const overrides = new Map<string, any>(entries.map(entry => [entry.id, entry]))

	// Without an entry, the defaults apply: everyone, in every channel.
	const roleRows: Array<{ label: string; allowed: boolean }> = []
	const channelRows: Array<{ label: string; allowed: boolean }> = []

	if (permissions?.ok) {
		const list: any[] = appEntry?.permissions ?? []

		for (const item of list) {
			if (item.type === 3) channelRows.push({ label: channelName(item.id), allowed: item.permission })
			else
				roleRows.push({
					label: item.type === 2 ? userName(item.id) : roleName(item.id),
					allowed: item.permission,
				})
		}

		if (!roleRows.some(row => row.label === '@everyone'))
			roleRows.unshift({ label: '@everyone', allowed: true })
		if (!channelRows.some(row => row.label === 'All Channels'))
			channelRows.unshift({ label: 'All Channels', allowed: true })
	}

	const commands: any[] =
		index?.ok && Array.isArray(index.body?.application_commands)
			? index.body.application_commands.filter((command: any) => command.application_id === app.id)
			: []

	const commandRows = commands
		.map(command => ({
			id: String(command.id),
			isSlash: command.type === 1 || command.type === undefined,
			name: command.type === 1 || command.type === undefined ? `/${command.name}` : String(command.name),
		}))
		.filter(command => command.name.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((a, b) => Number(a.isSlash) - Number(b.isSlash) || a.name.localeCompare(b.name))

	const botRole = roleList.find(role => role.tags?.bot_id === (app.botId ?? app.id))
	const botPermissions = botRole ? splitPermissions(String(botRole.permissions)) : undefined

	const appWebhooks: any[] =
		webhooks?.ok && Array.isArray(webhooks.body)
			? webhooks.body.filter((webhook: any) => webhook.application_id === app.id)
			: []

	const debug = () =>
		copy(
			JSON.stringify({ app: app.raw, roles, index: index && (index.ok ? 'ok' : index), permissions, webhooks }, redactSecrets, 1),
			'Debug info copied',
		)

	const remove = async () => {
		setRemoving(true)
		const result = await removeIntegration(guildId, app.integrationId)
		setRemoving(false)

		if (result.ok) {
			toast(`${app.name} removed`, 'SettingsIcon')
			onBack()
		} else {
			toast(`Could not remove: ${result.error}`, 'SettingsIcon')
			setConfirming(false)
		}
	}

	if (editor)
		return (
			<PermissionEditor
				key={editor.commandId}
				title={editor.title}
				subtitle={editor.subtitle}
				guildId={guildId}
				appId={app.id}
				commandId={editor.commandId}
				initial={overrides.get(editor.commandId)?.permissions ?? []}
				withDefaults={editor.commandId === app.id}
				roles={roleList}
				names={{ role: roleName, user: userName, channel: channelName }}
				onClose={() => setEditor(null)}
				onSaved={() => setVersion(v => v + 1)}
			/>
		)

	const backIcon = getAssetIdByName('ArrowLargeLeftIcon')
	const TableIcon = (Design.TableRow as any).Icon

	return (
		<View style={{ paddingBottom: 48 }}>
			<Design.TableRowGroup>
				<Design.TableRow
					label="Back to Integrations"
					icon={TableIcon && backIcon ? <TableIcon source={backIcon} /> : undefined}
					onPress={onBack}
				/>
			</Design.TableRowGroup>

			<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 }}>
				{app.iconUrl && (
					<Image source={{ uri: app.iconUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
				)}
				<View style={{ flex: 1 }}>
					<Text variant="heading-xl/bold">{app.name}</Text>
					<Note>
						{[
							app.addedAt ? `Added on ${formatDate(app.addedAt)}` : undefined,
							app.addedBy ? `Added by ${app.addedBy}` : undefined,
						]
							.filter(Boolean)
							.join(' • ')}
					</Note>
				</View>
			</View>

			<Design.TableRowGroup>
				<Design.TableRow
					label="Copy App ID"
					subLabel={app.id}
					onPress={() => copy(app.id, 'App ID copied')}
				/>
				<Design.TableRow
					label="Copy Invite Link"
					onPress={() =>
						copy(
							`https://discord.com/oauth2/authorize?client_id=${app.id}&scope=${app.scopes.length ? app.scopes.join('%20') : 'bot%20applications.commands'}`,
							'Invite link copied',
						)
					}
				/>
			</Design.TableRowGroup>

			<Heading>Command Permissions</Heading>
			<Note>Who can use this application's commands, and where.</Note>

			{failure(permissions) && (
				<Design.TableRowGroup>
					<Design.TableRow label="Could not load permissions" subLabel={failure(permissions)} />
				</Design.TableRowGroup>
			)}

			{permissions?.ok && (
				<>
					<View style={{ marginTop: 12 }}>
						<Text variant="text-md/semibold">Roles & Members</Text>
					</View>
					<Design.TableRowGroup>
						{roleRows.map(row => (
							<PermissionRow key={row.label} label={row.label} allowed={row.allowed} />
						))}
					</Design.TableRowGroup>

					<View style={{ marginTop: 12 }}>
						<Text variant="text-md/semibold">Channels</Text>
					</View>
					<Design.TableRowGroup>
						{channelRows.map(row => (
							<PermissionRow key={row.label} label={row.label} allowed={row.allowed} />
						))}
					</Design.TableRowGroup>

					<View style={{ height: 12 }} />
					<Design.TableRowGroup>
						<Design.TableRow
							label="Edit app permissions"
							subLabel="Roles, members and channels"
							arrow
							onPress={() =>
								setEditor({
									commandId: app.id,
									title: 'Command Permissions',
									subtitle: `All commands of ${app.name}`,
								})
							}
						/>
					</Design.TableRowGroup>
				</>
			)}

			<View style={{ marginTop: 12, marginBottom: 8 }}>
				<Text variant="text-md/semibold">Commands</Text>
			</View>
			<TextInput
				placeholder="Search"
				value={query}
				isClearable
				onChange={(value: any) =>
					setQuery(typeof value === 'string' ? value : (value?.nativeEvent?.text ?? ''))
				}
			/>
			<View style={{ height: 8 }} />
			<Design.TableRowGroup>
				{!index && <Design.TableRow label="Loading commands..." />}
				{failure(index) && <Design.TableRow label="Could not load commands" subLabel={failure(index)} />}
				{index?.ok && commandRows.length === 0 && <Design.TableRow label="No commands found" />}
				{commandRows.map(command => (
					<Design.TableRow
						key={command.id}
						label={command.name}
						subLabel={overrides.has(command.id) ? 'Custom permissions' : undefined}
						arrow
						onPress={() =>
							setEditor({ commandId: command.id, title: command.name, subtitle: 'Overrides for this command' })
						}
					/>
				))}
			</Design.TableRowGroup>

			<Heading>Bot</Heading>
			{failure(roles) && (
				<Design.TableRowGroup>
					<Design.TableRow label="Could not load roles" subLabel={failure(roles)} />
				</Design.TableRowGroup>
			)}
			{roles?.ok && !botRole && <Note>This app has no role in this server.</Note>}
			{botRole && botPermissions && (
				<View>
					<Text variant="text-md/semibold">{`Role: ${botRole.name}`}</Text>
					<PermissionGrid title="Granted permissions" names={botPermissions.granted} color={GREEN} mark="✓" />
					<PermissionGrid title="Denied permissions" names={botPermissions.denied} color={RED} mark="✗" />
				</View>
			)}

			<Heading>Webhooks</Heading>
			{failure(webhooks) && <Note>{`Could not load webhooks: ${failure(webhooks)}`}</Note>}
			{webhooks?.ok && appWebhooks.length === 0 && (
				<Note>This application has no webhooks in this server.</Note>
			)}
			{appWebhooks.length > 0 && (
				<Design.TableRowGroup>
					{appWebhooks.map(webhook => (
						<Design.TableRow key={webhook.id} label={webhook.name} subLabel={webhook.id} />
					))}
				</Design.TableRowGroup>
			)}

			<Heading>Remove App</Heading>
			<Note>
				Removing this integration will remove any apps (including bots and webhooks) on this page
				from your server. This action cannot be undone.
			</Note>
			<View style={{ height: 8 }} />
			<Design.TableRowGroup>
				{!confirming ? (
					<Design.TableRow label="Remove App" variant="danger" onPress={() => setConfirming(true)} />
				) : (
					<>
						<Design.TableRow
							label={removing ? 'Removing...' : `Yes, remove ${app.name}`}
							variant="danger"
							onPress={removing ? undefined : remove}
						/>
						<Design.TableRow label="Cancel" onPress={() => setConfirming(false)} />
					</>
				)}
			</Design.TableRowGroup>

			<View style={{ height: 16 }} />
			<Design.TableRowGroup>
				<Design.TableRow label="Copy debug info" subLabel="For bug reports" onPress={debug} />
			</Design.TableRowGroup>
		</View>
	)
}
