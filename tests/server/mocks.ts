import { vi } from 'vitest';

export type MockEvent = object;

export const getRouterParam = vi.fn();
export const readBody = vi.fn();
export const setResponseStatus = vi.fn();
export const createPoll = vi.fn();
export const requirePollBySlug = vi.fn();
export const getPollWithSlots = vi.fn();
export const getPollResults = vi.fn();
export const createParticipantWithVotes = vi.fn();
export const getHeader = vi.fn();
export const requireParticipant = vi.fn();
export const updateParticipantWithVotes = vi.fn();

export function createError(opts: { statusCode: number; message: string }) {
	const err = new Error(opts.message) as Error & { statusCode: number };
	err.statusCode = opts.statusCode;
	return err;
}
