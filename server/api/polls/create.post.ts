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

	for (const slot of body.slots) {
		if (typeof slot?.start !== 'string' || typeof slot?.end !== 'string') {
			throw createError({
				statusCode: 400,
				message: 'Chaque créneau doit avoir start et end (ISO 8601)',
			});
		}
		const start = new Date(slot.start);
		const end = new Date(slot.end);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
			throw createError({
				statusCode: 400,
				message: 'start et end doivent être des dates valides',
			});
		}
		if (end.getTime() <= start.getTime()) {
			throw createError({
				statusCode: 400,
				message: 'end doit être après start',
			});
		}
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
