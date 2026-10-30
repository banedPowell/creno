import { slotsUpdateSchema } from '../../../../shared/utils/pollSettings';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug')!;
	const poll = await requirePollBySlug(slug);
	requirePollAdmin(event, poll);

	const result = slotsUpdateSchema.safeParse(await readBody(event));
	if (!result.success)
		throw createError({
			statusCode: 400,
			message: result.error.issues[0]!.message,
		});

	return replacePollSlots(poll, result.data);
});
