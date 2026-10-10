import { registerIntegrationsRow } from './features/integrations'

export default plugin({
	start({ cleanup }) {
		registerIntegrationsRow(cleanup)
	},
})
