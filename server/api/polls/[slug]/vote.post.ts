import { votePayloadSchema } from '../../../../shared/utils/votePayload';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const parsed = votePayloadSchema.safeParse((await readBody(event)) ?? {});

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]!.message,
		});
	}

	const poll = await requirePollBySlug(slug);

	if (poll.closedAt && poll.closedAt <= new Date()) {
		throw createError({
			statusCode: 410,
			message: 'Ce sondage est fermé',
		});
	}

	const result = await createParticipantWithVotes(
		poll.id,
		parsed.data.name,
		parsed.data.votes,
	);

	setResponseStatus(event, 201);
	return result;
});
