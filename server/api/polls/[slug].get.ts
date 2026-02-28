export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const poll = await requirePollBySlug(slug);
	const slots = await getPollWithSlots(poll.id);

	return { ...poll, slots };
});
