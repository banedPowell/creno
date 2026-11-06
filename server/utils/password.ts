import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;

export const hashPassword = (password: string): string => {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
	return `scrypt:${salt}:${hash}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
	const [scheme, salt, hash] = stored.split(':');
	if (scheme !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'hex');
	const given = scryptSync(password, salt, expected.length);
	return timingSafeEqual(given, expected);
};
