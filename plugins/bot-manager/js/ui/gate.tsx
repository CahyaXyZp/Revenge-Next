import { React } from '@revenge-mod/react'
import { useBackInterception } from '../lib/back'
import AppsSection from './apps-section'
import ManageApp from './manage'
import Transition from './transition'
import type { AppInfo } from '../lib/api'
import type { ReactElement } from 'react'

/**
 * Wraps the Integrations screen content. Shows the original content with the Bots and Apps
 * section, or the Manage page of one app in its place. Discord's own back button returns from
 * the Manage page.
 */
export default function IntegrationsGate(props: {
	original: ReactElement
	guildId: string
}) {
	const [app, setApp] = React.useState<AppInfo | null>(null)
	const [from, setFrom] = React.useState<'left' | 'right'>('left')
	const nativeBack = useBackInterception()

	if (app)
		return (
			<ManageApp
				key={app.id}
				app={app}
				guildId={props.guildId}
				nativeBack={nativeBack}
				onBack={() => {
					setFrom('left')
					setApp(null)
				}}
			/>
		)

	return (
		<Transition key="list" from={from}>
			{props.original}
			<AppsSection guildId={props.guildId} onManage={setApp} />
		</Transition>
	)
}
