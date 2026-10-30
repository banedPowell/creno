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
	getHeader,
	requireParticipant,
	updateParticipantWithVotes,
	hasParticipantToken,
	updatePollSettings,
	replacePollSlots,
	deletePoll,
} from './mocks';
import {
	isPollAdmin,
	requirePollAccess,
	requirePollAdmin,
	toPublicPoll,
} from '../../server/utils/access';
import { hidePollResults } from '../../server/utils/poll';

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn);
vi.stubGlobal('readBody', readBody);
vi.stubGlobal('getRouterParam', getRouterParam);
vi.stubGlobal('getHeader', getHeader);
vi.stubGlobal('setResponseStatus', setResponseStatus);
vi.stubGlobal('createError', createError);

vi.stubGlobal('createPoll', createPoll);
vi.stubGlobal('requirePollBySlug', requirePollBySlug);
vi.stubGlobal('getPollWithSlots', getPollWithSlots);
vi.stubGlobal('getPollResults', getPollResults);
vi.stubGlobal('createParticipantWithVotes', createParticipantWithVotes);
vi.stubGlobal('requireParticipant', requireParticipant);
vi.stubGlobal('updateParticipantWithVotes', updateParticipantWithVotes);
vi.stubGlobal('validateSlotIds', vi.fn());
vi.stubGlobal('hasParticipantToken', hasParticipantToken);
vi.stubGlobal('updatePollSettings', updatePollSettings);
vi.stubGlobal('replacePollSlots', replacePollSlots);
vi.stubGlobal('deletePoll', deletePoll);

// The real access rules, they only lean on the header and error globals above
vi.stubGlobal('isPollAdmin', isPollAdmin);
vi.stubGlobal('requirePollAccess', requirePollAccess);
vi.stubGlobal('requirePollAdmin', requirePollAdmin);
vi.stubGlobal('toPublicPoll', toPublicPoll);
vi.stubGlobal('hidePollResults', hidePollResults);
