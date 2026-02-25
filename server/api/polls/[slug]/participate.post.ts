import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { useDB } from '../../../utils/db';
import {
	polls,
	participants,
	responses,
	timeSlots,
} from '../../../database/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	const body = await readBody(event);

	if (!slug) {
		throw createError({ statusCode: 400, statusMessage: 'Slug is required' });
	}

	if (!body.name || !body.responses || !Array.isArray(body.responses)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Name and responses are required',
		});
	}

	const db = useDB();

	const poll = await db.select().from(polls).where(eq(polls.slug, slug)).get();
	if (!poll) {
		throw createError({ statusCode: 404, statusMessage: 'Poll not found' });
	}

	if (poll.closedAt) {
		throw createError({ statusCode: 403, statusMessage: 'Poll is closed' });
	}

	const slots = await db
		.select()
		.from(timeSlots)
		.where(eq(timeSlots.pollId, poll.id))
		.all();
	const slotIds = new Set(slots.map((s) => s.id));

	const participantId = nanoid();
	await db.insert(participants)
		.values({
			id: participantId,
			pollId: poll.id,
			name: body.name,
		});

	for (const resp of body.responses) {
		if (!slotIds.has(resp.timeSlotId)) continue;
		await db.insert(responses)
			.values({
				id: nanoid(),
				participantId,
				timeSlotId: resp.timeSlotId,
				availability: resp.availability,
			});
	}

	return { participantId };
});
