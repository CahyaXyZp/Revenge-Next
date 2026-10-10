import { Design } from '@revenge-mod/discord/design'
import type { ReactElement } from 'react'

/** Every key this plugin gives to the rows and groups it adds. Used to avoid adding them twice. */
export const ROW_KEY_PREFIX = 'server-tweaks-'

const childrenOf = (element: any): any[] =>
	[element?.props?.children].flat(Number.POSITIVE_INFINITY).filter(Boolean)

const isOurs = (element: any) =>
	typeof element?.key === 'string' && element.key.startsWith(ROW_KEY_PREFIX)

/**
 * Adds rows to a sheet so they sit with Discord's own rows.
 *
 * - If the sheet has Discord's "Copy ... ID" row (developer mode), the rows go into that same
 *   group, right after it.
 * - Otherwise they go into the last group that has rows.
 * - If the sheet has no row group at all, they get a group of their own.
 *
 * Sheets can re-render, so nothing is added when the rows are already there.
 */
export function addRowsToSheet(groups: ReactElement[], rows: ReactElement[]) {
	if (rows.length === 0) return

	if (groups.some(group => isOurs(group) || childrenOf(group).some(isOurs)))
		return

	const hasLabel = (row: any) => typeof row?.props?.label === 'string'
	const isCopyId = (row: any) => /\bID$/.test(row?.props?.label ?? '')

	let index = groups.findIndex(group => childrenOf(group).some(isCopyId))

	if (index === -1) {
		for (let i = groups.length - 1; i >= 0; i--) {
			if (childrenOf(groups[i]).some(hasLabel)) {
				index = i
				break
			}
		}
	}

	if (index === -1) {
		groups.push(
			<Design.ActionSheetRow.Group key={`${ROW_KEY_PREFIX}group`}>
				{rows}
			</Design.ActionSheetRow.Group>,
		)
		return
	}

	// Elements are immutable, so swap the group for a copy that has the extra rows.
	const group = groups[index] as ReactElement<any>
	groups[index] = {
		...group,
		props: { ...group.props, children: [...childrenOf(group), ...rows] },
	} as ReactElement
}
