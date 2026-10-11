import { EDIT_TOKEN_HEADER } from '../../../../shared/utils/votePayload';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const poll = await requirePollBySlug(slug);
	requirePollAccess(event, poll);
	const results = await getPollResults(poll.id);

	const resultsHidden =
		!!poll.hideResults &&
		!isPollAdmin(event, poll) &&
		!(await hasParticipantToken(
			poll.id,
			getHeader(event, EDIT_TOKEN_HEADER),
		));

	return {
		...toPublicPoll(poll),
		...(resultsHidden ? hidePollResults(results) : results),
		resultsHidden,
	};
});
