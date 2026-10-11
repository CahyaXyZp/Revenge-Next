import { ToastActionCreators } from '@revenge-mod/discord/actions'
import { Clipboard } from '@revenge-mod/externals/react-native-clipboard'
import { lookupGeneratedIconComponent } from '@revenge-mod/utils/discord'

/** Shows a short toast. */
export function toast(content: string, icon = 'CopyIcon') {
	ToastActionCreators.open({
		key: 'BOT_MANAGER_TOAST',
		content,
		IconComponent: lookupGeneratedIconComponent(icon),
	})
}

/** Copies text, then shows a toast. */
export function copy(text: string, message: string) {
	Clipboard.setString(text)
	toast(message)
}
