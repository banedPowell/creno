import { timingSafeEqual } from 'node:crypto';

// Constant time, so how long a wrong token takes to refuse tells nothing
// about how much of it was right
export const isSameToken = (given: string, expected: string): boolean => {
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
};
