export default defineEventHandler(async (event) => {
	const body = await readBody(event);

	if (!body.title || typeof body.title !== 'string') {
		throw createError({
			statusCode: 400,
			message: 'Le titre est requis',
		});
	}

	if (!Array.isArray(body.slots) || body.slots.length === 0) {
		throw createError({
			statusCode: 400,
			message: 'Au moins un créneau est requis',
		});
	}

	const now = new Date();
	const closedAt = body.closedAt
		? new Date(
				typeof body.closedAt === 'number'
					? body.closedAt * 1000
					: body.closedAt,
			)
		: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

	if (closedAt <= now) {
		throw createError({
			statusCode: 400,
			message: 'La date de fermeture doit être dans le futur',
		});
	}

	const poll = await createPoll({
		title: body.title,
		description: body.description,
		closedAt,
		slots: body.slots,
	});

	setResponseStatus(event, 201);
	return poll;
});
