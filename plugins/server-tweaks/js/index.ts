import { registerCopyChannelName } from './features/copy-channel-name'
import { patchActionSheet } from './patches/actionsheet'

export default plugin({
	start({ cleanup }) {
		// Hooks every action sheet that opens, so features can add rows to it.
		patchActionSheet(cleanup)

		// Features. Each one registers its own action sheet patch and cleans up after itself.
		registerCopyChannelName(cleanup)
	},
})
