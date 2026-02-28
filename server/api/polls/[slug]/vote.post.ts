const VALID_STATUSES = ['yes', 'maybe'] as const;

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const body = await readBody(event);

	if (!body.name || typeof body.name !== 'string') {
		throw createError({
			statusCode: 400,
			message: 'Le nom du participant est requis',
		});
	}

	const rawVotes: {
		slotId: string;
		status: (typeof VALID_STATUSES)[number];
	}[] = Array.isArray(body.votes) ? body.votes : [];

	for (const vote of rawVotes) {
		if (!vote.slotId || typeof vote.slotId !== 'string') {
			throw createError({
				statusCode: 400,
				message: 'Chaque vote doit contenir un slotId valide',
			});
		}

		if (
			!VALID_STATUSES.includes(
				vote.status as (typeof VALID_STATUSES)[number],
			)
		) {
			throw createError({
				statusCode: 400,
				message: `Statut invalide "${vote.status}". Valeurs acceptées : ${VALID_STATUSES.join(', ')}`,
			});
		}
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
		body.name,
		rawVotes,
	);

	setResponseStatus(event, 201);
	return result;
});
