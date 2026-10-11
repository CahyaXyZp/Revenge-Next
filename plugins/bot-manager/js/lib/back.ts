import { lookupModule } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { React, ReactNative } from '@revenge-mod/react'

type Handler = () => void

/** Pages that want to handle "back" themselves. The last one wins. */
const stack: Handler[] = []

let useNavigationHook: (() => any) | null | undefined

function getUseNavigation() {
	if (useNavigationHook !== undefined) return useNavigationHook

	try {
		const [module] = lookupModule(withProps<any>('useNavigation', 'NavigationContainer'))
		useNavigationHook = module?.useNavigation ?? null
	} catch {
		useNavigationHook = null
	}

	return useNavigationHook
}

/**
 * Lets Discord's own back button, swipe and hardware back close our pages first. Call once from
 * the screen's root. Returns false when Discord's navigation could not be reached, so the
 * caller can show its own back button instead.
 */
export function useBackInterception(): boolean {
	const hook = getUseNavigation()

	let navigation: any
	try {
		navigation = hook?.()
	} catch {
		navigation = undefined
	}

	React.useEffect(() => {
		const unsubscribe = navigation?.addListener?.('beforeRemove', (event: any) => {
			const top = stack[stack.length - 1]
			if (!top) return

			event.preventDefault()
			top()
		})

		const hardware = ReactNative.BackHandler?.addEventListener?.('hardwareBackPress', () => {
			const top = stack[stack.length - 1]
			if (!top) return false

			top()
			return true
		})

		return () => {
			unsubscribe?.()
			hardware?.remove?.()
		}
	}, [navigation])

	return typeof navigation?.addListener === 'function'
}

/** While this component is shown, "back" calls `handler` instead of leaving the screen. */
export function useBackHandler(handler: Handler) {
	const ref = React.useRef(handler)
	ref.current = handler

	React.useEffect(() => {
		const entry = () => ref.current()
		stack.push(entry)

		return () => {
			const index = stack.indexOf(entry)
			if (index !== -1) stack.splice(index, 1)
		}
	}, [])
}
