import { registerIntegrationsRow } from './bot-manager/features/integrations'
import { registerCopyChannelInfo } from './features/copy-channel-info'
import { patchActionSheet } from './patches/actionsheet'

export default plugin({
	start({ cleanup }) {
		// Hooks every action sheet that opens, so features can add rows to it.
		patchActionSheet(cleanup)

		// Features. Each one registers its own action sheet patch and cleans up after itself.
		registerCopyChannelInfo(cleanup)
		// Bots and Apps with a Manage page, on Server Settings > Integrations.
		registerIntegrationsRow(cleanup)
	},
})
