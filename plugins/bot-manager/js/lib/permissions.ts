/** Discord permission bits and their English names, as shown on desktop. */
export const PERMISSIONS: Array<[bit: number, label: string]> = [
	[3, 'Administrator'],
	[5, 'Manage Server'],
	[28, 'Manage Roles'],
	[4, 'Manage Channels'],
	[1, 'Kick Members'],
	[2, 'Ban Members'],
	[0, 'Create Invite'],
	[27, 'Manage Nicknames'],
	[26, 'Change Nickname'],
	[30, 'Manage Expressions'],
	[43, 'Create Expressions'],
	[29, 'Manage Webhooks'],
	[7, 'View Audit Log'],
	[10, 'View Channels'],
	[33, 'Manage Events'],
	[44, 'Create Events'],
	[40, 'Moderate Members'],
	[50, 'Use External Apps'],
	[11, 'Send Messages'],
	[38, 'Send Messages in Threads'],
	[35, 'Create Public Threads'],
	[36, 'Create Private Threads'],
	[12, 'Send TTS Messages'],
	[13, 'Manage Messages'],
	[34, 'Manage Threads'],
	[14, 'Embed Links'],
	[15, 'Attach Files'],
	[16, 'Read Message History'],
	[17, 'Mention @everyone, @here, and All Roles'],
	[6, 'Add Reactions'],
	[18, 'Use External Emoji'],
	[37, 'Use External Stickers'],
	[31, 'Use Application Commands'],
	[46, 'Send Voice Message'],
	[49, 'Create Polls'],
	[51, 'Pin Messages'],
	[52, 'Bypass Slowmode'],
	[20, 'Connect'],
	[21, 'Speak'],
	[22, 'Mute Members'],
	[23, 'Deafen Members'],
	[24, 'Move Members'],
	[25, 'Use Voice Activity'],
	[8, 'Priority Speaker'],
	[9, 'Video'],
	[39, 'Use Activities'],
	[42, 'Use Soundboard'],
	[45, 'Use External Sounds'],
	[48, 'Set Voice Channel Status'],
	[32, 'Request to Speak'],
	[19, 'View Server Insights'],
	[41, 'View Server Subscription Insights'],
]

/** Tests one bit of a permission value given as a decimal string. Avoids BigInt. */
export function hasBit(value: string, bit: number): boolean {
	let digits = String(value).split('').map(Number)

	for (let position = 0; position <= bit; position++) {
		let carry = 0
		const next: number[] = []

		for (const digit of digits) {
			const current = carry * 10 + digit
			next.push(Math.floor(current / 2))
			carry = current % 2
		}

		// The remainder is the lowest bit of the number being divided.
		if (position === bit) return carry === 1

		let start = 0
		while (start < next.length - 1 && next[start] === 0) start++
		digits = next.slice(start)
	}

	return false
}

/** Splits a role's permissions into the granted and denied names. */
export function splitPermissions(value: string) {
	const granted: string[] = []
	const denied: string[] = []

	for (const [bit, label] of PERMISSIONS)
		(hasBit(value, bit) ? granted : denied).push(label)

	return { granted, denied }
}

/** Subtracts one from a decimal string. Discord uses `guildId - 1` for "All Channels". */
export function decrement(id: string): string {
	const digits = id.split('').map(Number)

	for (let i = digits.length - 1; i >= 0; i--) {
		if (digits[i] > 0) {
			digits[i]--
			break
		}
		digits[i] = 9
	}

	return digits.join('').replace(/^0+(?=\d)/, '')
}
