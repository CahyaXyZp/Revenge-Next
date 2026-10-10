import { React } from '@revenge-mod/react'
import AppsSection from './apps-section'
import ManageApp from './manage'
import type { AppInfo } from '../lib/api'
import type { ReactElement } from 'react'

/**
 * Wraps the Integrations screen content. Shows the original content with the Bots and Apps
 * section, or the Manage page of one app in its place.
 */
export default function IntegrationsGate(props: {
	original: ReactElement
	guildId: string
}) {
	const [app, setApp] = React.useState<AppInfo | null>(null)

	if (app)
		return <ManageApp app={app} guildId={props.guildId} onBack={() => setApp(null)} />

	return (
		<>
			{props.original}
			<AppsSection guildId={props.guildId} onManage={setApp} />
		</>
	)
}
