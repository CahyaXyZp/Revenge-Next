import { getAssetIdByName } from '@revenge-mod/assets'
import { ActionSheetActionCreators } from '@revenge-mod/discord/actions'
import { Design } from '@revenge-mod/discord/design'
import { Stores } from '@revenge-mod/discord/flux'
import { afterJSX } from '@revenge-mod/react/jsx-runtime'
import { toast } from '../lib/toast'
import AppsSheet from '../ui/apps-sheet'
import type { Cleanup } from '../lib/cleanup'
import type { ReactElement } from 'react'

/**
 * Adds a "Bots and Apps" row to Server Settings > Integrations, under Webhooks and
 * Channels Followed.
 *
 * The screen is found by its two rows. Their labels are matched in English only.
 * Toasts report what the plugin saw, so a missing row can be diagnosed from the screen.
 */

const ROW_KEY = 'bot-manager-row'
const SCREEN_LABELS = new Set(['Webhooks', 'Channels Followed'])

const childrenOf = (element: any): any[] =>
	[element?.props?.children].flat(Number.POSITIVE_INFINITY).filter(Boolean)

/** Shows each diagnostic message at most once every few seconds, as screens re-render. */
const last = new Map<string, number>()
function reportOnce(message: string) {
	const now = Date.now()
	if (now - (last.get(message) ?? 0) < 5000) return
	last.set(message, now)
	toast(message, 'SettingsIcon')
}

function openApps() {
	const guildId = (Stores.SelectedGuildStore as any)?.getGuildId?.()
	if (!guildId) return toast('Open a server first', 'SettingsIcon')

	ActionSheetActionCreators.openLazy(
		Promise.resolve({ default: AppsSheet }),
		'BotManagerApps',
		{ guildId },
	)
}

function appsRow() {
	const icon = getAssetIdByName('SettingsIcon')
	const Icon = (Design.TableRow as any).Icon

	return (
		<Design.TableRow
			key={ROW_KEY}
			label="Bots and Apps"
			subLabel="Apps installed in this server"
			icon={Icon && icon ? <Icon source={icon} /> : undefined}
			arrow
			onPress={openApps}
		/>
	)
}

export function registerIntegrationsRow(cleanup: Cleanup) {
	// Probe: tells us the Integrations rows were rendered, even if the group below is not matched.
	cleanup(
		afterJSX(Design.TableRow, element => {
			if (SCREEN_LABELS.has((element.props as any)?.label))
				reportOnce('Bot Manager: Integrations rows seen')

			return element
		}),
	)

	cleanup(
		afterJSX(Design.TableRowGroup, element => {
			const children = childrenOf(element)

			if (!children.some(child => SCREEN_LABELS.has(child?.props?.label)))
				return element

			if (children.some(child => child?.key === ROW_KEY)) return element

			reportOnce('Bot Manager: Bots and Apps row added')

			return {
				...element,
				props: { ...element.props, children: [...children, appsRow()] },
			} as ReactElement<any>
		}),
	)
}
