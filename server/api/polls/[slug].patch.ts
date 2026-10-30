import { pollSettingsSchema } from '../../../shared/utils/pollSettings';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug')!;
	const poll = await requirePollBySlug(slug);
	requirePollAdmin(event, poll);

	const result = pollSettingsSchema.safeParse(await readBody(event));
	if (!result.success)
		throw createError({
			statusCode: 400,
			message: result.error.issues[0]!.message,
		});

	return toPublicPoll(await updatePollSettings(poll, result.data));
});
