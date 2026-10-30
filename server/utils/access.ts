import type { H3Event } from 'h3';
import type { Poll } from '../db/schema';
import {
	ADMIN_TOKEN_HEADER,
	PASSWORD_HEADER,
} from '../../shared/utils/pollSettings';
import { verifyPassword } from './password';
import { isSameToken } from './token';

type PollSecrets = Pick<Poll, 'adminToken' | 'passwordHash'>;

export const isPollAdmin = (event: H3Event, poll: PollSecrets): boolean => {
	const token = getHeader(event, ADMIN_TOKEN_HEADER);
	return !!token && isSameToken(token, poll.adminToken);
};

export const requirePollAdmin = (event: H3Event, poll: PollSecrets) => {
	if (!isPollAdmin(event, poll))
		throw createError({
			statusCode: 403,
			message: 'Seul l’organisateur peut faire cela',
		});
};

const readPassword = (event: H3Event): string | undefined => {
	const raw = getHeader(event, PASSWORD_HEADER);
	if (!raw) return undefined;
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
};

// A protected poll only opens with its password, or to its organiser
export const requirePollAccess = (event: H3Event, poll: PollSecrets) => {
	if (!poll.passwordHash || isPollAdmin(event, poll)) return;
	const password = readPassword(event);
	if (!password)
		throw createError({ statusCode: 401, message: 'Mot de passe requis' });
	if (!verifyPassword(password, poll.passwordHash))
		throw createError({
			statusCode: 401,
			message: 'Mot de passe incorrect',
		});
};

// What may leave the server: no admin token, no password hash
export const toPublicPoll = <T extends PollSecrets>(poll: T) => {
	const { adminToken: _adminToken, passwordHash, ...rest } = poll;
	return { ...rest, hasPassword: !!passwordHash };
};
