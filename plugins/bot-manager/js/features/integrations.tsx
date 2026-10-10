import { Stores } from '@revenge-mod/discord/flux'
import { Design } from '@revenge-mod/discord/design'
import { React } from '@revenge-mod/react'
import { afterJSX } from '@revenge-mod/react/jsx-runtime'
import { toast } from '../lib/toast'
import AppsSection from '../ui/apps-section'
import type { Cleanup } from '../lib/cleanup'
import type { ReactElement } from 'react'

/**
 * Adds the "Bots and Apps" section to Server Settings > Integrations, under Webhooks and
 * Channels Followed.
 *
 * The screen is found by the group that holds those two rows. Their labels are matched in
 * English only. The section goes right after that group, in the same place as on desktop.
 */

const SECTION_KEY = 'bot-manager-section'
const SCREEN_LABELS = ['Webhooks', 'Channels Followed']

const childrenOf = (element: any): any[] =>
	[element?.props?.children].flat(Number.POSITIVE_INFINITY).filter(Boolean)

let lastToast = 0

export function registerIntegrationsRow(cleanup: Cleanup) {
	cleanup(
		afterJSX(Design.TableRowGroup, element => {
			const children = childrenOf(element)

			// Both rows must be there, so an app that happens to be named "Webhooks" is not matched.
			const labels = children.map(child => child?.props?.label)
			if (!SCREEN_LABELS.every(label => labels.includes(label))) return element

			const guildId = (Stores.SelectedGuildStore as any)?.getGuildId?.()
			if (!guildId) return element

			// Shown once per visit, as the screen re-renders.
			const now = Date.now()
			if (now - lastToast > 5000) toast('Bot Manager: Bots and Apps added', 'SettingsIcon')
			lastToast = now

			return (
				<React.Fragment key={element.key ?? undefined}>
					{element}
					<AppsSection key={SECTION_KEY} guildId={guildId} />
				</React.Fragment>
			) as ReactElement<any>
		}),
	)
}
