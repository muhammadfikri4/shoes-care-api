import * as crypto from 'crypto'

export const generateHmac = (key: string, data: string): string => {
	return crypto.createHmac('sha512', key).update(data).digest('hex')
}

export const generateHash = (text: string): string => {
	return crypto.createHash('sha256').update(text).digest('hex')
}