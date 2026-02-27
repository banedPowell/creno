export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const poll = await requirePollBySlug(slug);
	const results = await getPollResults(poll.id);

	return { ...poll, ...results };
});
