import { React, ReactNative } from '@revenge-mod/react'
import type { ReactNode } from 'react'

/** Fades and slides its content in when it appears. */
export default function Transition(props: { children: ReactNode; from?: 'left' | 'right' }) {
	const { Animated } = ReactNative
	const progress = React.useRef(new Animated.Value(0)).current

	React.useEffect(() => {
		Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start()
	}, [])

	const distance = props.from === 'left' ? -32 : 32

	return (
		<Animated.View
			style={{
				opacity: progress,
				transform: [
					{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
				],
			}}
		>
			{props.children}
		</Animated.View>
	)
}
