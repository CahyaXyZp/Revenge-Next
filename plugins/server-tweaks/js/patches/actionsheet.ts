/**
 * Action sheet patching helper.
 *
 * Discord opens its bottom sheets (the long-press menus) through
 * `ActionSheetActionCreators.openLazy(sheetPromise, key, props)`. We hook that call, wait for the
 * sheet module, then patch its render output so features can edit the list of row groups.
 *
 * The approach, including the group finders below, follows the one used in
 * tralwdwd/revenge-next-plugins (GPL-3.0). Credit to tralwdwd.
 */

import { ActionSheetActionCreators } from '@revenge-mod/discord/actions'
import { after, before } from '@revenge-mod/patcher'
import { findInReactFiber } from '@revenge-mod/utils/react'
import type { ReactElement } from 'react'

export type Cleanup = (fn: () => void) => void

/** Receives the sheet's row groups. Mutate the array to add, remove or reorder groups. */
export type ActionSheetCallback<P extends {} = any> = (
	groups: ReactElement[],
	props: P,
) => void

type Patch = {
	finder: string | RegExp
	callback: ActionSheetCallback
}

const patches: Patch[] = []

/**
 * Registers a callback for every sheet whose key matches `finder`.
 * Returns an unregister function. Pass it to `cleanup`.
 */
export function registerActionSheetPatch<P extends {} = any>(
	finder: string | RegExp,
	callback: ActionSheetCallback<P>,
): () => void {
	const patch: Patch = { finder, callback }
	patches.push(patch)

	return () => {
		const index = patches.indexOf(patch)
		if (index !== -1) patches.splice(index, 1)
	}
}

const matches = (finder: string | RegExp, key: string) =>
	typeof finder === 'string' ? key === finder : finder.test(key)

type WithChildren = { children: ReactElement[] }

/** Tries a few known sheet shapes until one yields the array of row groups. */
function findActionGroups(tree: ReactElement): ReactElement[] | undefined {
	const finders: Array<() => ReactElement[] | undefined> = [
		() =>
			findInReactFiber(
				tree,
				(node: any) =>
					node?.[0]?.type?.name === 'ActionSheetRowGroup' ||
					node?.[0]?.props?.children?.[0]?.props?.label,
			) as ReactElement[] | undefined,

		() =>
			(
				findInReactFiber(
					tree,
					(node: any) => node?.type?.name === 'Stack' || node?.props?.spacing,
				) as ReactElement<WithChildren> | undefined
			)?.props.children,

		() =>
			(
				findInReactFiber(
					tree,
					(node: any) =>
						!!node?.props?.children?.find?.(
							(child: any) => child?.props?.children?.[0]?.props?.label,
						),
				) as ReactElement<WithChildren> | undefined
			)?.props.children,
	]

	for (const find of finders) {
		const result = find()
		if (result != null) return result
	}
}

function runPatches(tree: ReactElement, props: any, active: Patch[]) {
	const groups = findActionGroups(tree)
	if (!groups) return

	for (const patch of active) patch.callback(groups, props)
}

/** Patches a sheet whose default export is a `React.memo` object. */
function patchMemoSheet(
	module: any,
	props: any,
	cleanup: Cleanup,
	active: Patch[],
) {
	const unpatch = after(module.default, 'type', (tree: any) => {
		runPatches(tree, props, active)
		unpatch()
		return tree
	})

	cleanup(unpatch)
}

/** Patches a sheet whose default export is a plain function component. */
function patchFunctionSheet(
	module: any,
	props: any,
	cleanup: Cleanup,
	active: Patch[],
) {
	const unpatch = after(module, 'default', (result: any) => {
		if (typeof result?.type === 'function') {
			cleanup(
				after(result, 'type', (tree: any) => {
					runPatches(tree, props, active)
					return tree
				}),
			)
		} else if (result?.props?.children) {
			for (const patch of active) patch.callback(result.props.children, props)
		}

		unpatch()
		return result
	})

	cleanup(unpatch)
}

/** Hooks `openLazy`. Call once from the plugin's `start`. */
export function patchActionSheet(cleanup: Cleanup) {
	cleanup(
		before(ActionSheetActionCreators, 'openLazy', (args: any) => {
			const [sheet, key, props] = args

			const active = patches.filter(patch => matches(patch.finder, key))
			if (active.length === 0) return args

			sheet.then((module: any) => {
				if (typeof module.default === 'object') {
					patchMemoSheet(module, props, cleanup, active)
				} else {
					patchFunctionSheet(module, props, cleanup, active)
				}
			})

			return args
		}),
	)
}
