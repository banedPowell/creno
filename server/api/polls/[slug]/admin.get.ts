// The organiser's view: everything, hidden answers included
export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug')!;
	const poll = await requirePollBySlug(slug);
	requirePollAdmin(event, poll);

	const results = await getPollResults(poll.id);
	return { ...toPublicPoll(poll), ...results, resultsHidden: false };
});
