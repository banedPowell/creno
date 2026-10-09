import { vi } from 'vitest';
import {
	getRouterParam,
	readBody,
	setResponseStatus,
	createError,
	createPoll,
	requirePollBySlug,
	getPollWithSlots,
	getPollResults,
	createParticipantWithVotes,
} from './mocks';

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn);
vi.stubGlobal('readBody', readBody);
vi.stubGlobal('getRouterParam', getRouterParam);
vi.stubGlobal('setResponseStatus', setResponseStatus);
vi.stubGlobal('createError', createError);

vi.stubGlobal('createPoll', createPoll);
vi.stubGlobal('requirePollBySlug', requirePollBySlug);
vi.stubGlobal('getPollWithSlots', getPollWithSlots);
vi.stubGlobal('getPollResults', getPollResults);
vi.stubGlobal('createParticipantWithVotes', createParticipantWithVotes);
vi.stubGlobal('validateSlotIds', vi.fn());
