export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug')!;
	const poll = await requirePollBySlug(slug);
	requirePollAdmin(event, poll);

	await deletePoll(poll.id);
	setResponseStatus(event, 204);
	return null;
});
