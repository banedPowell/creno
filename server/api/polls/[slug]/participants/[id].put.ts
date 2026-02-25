import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { useDB } from '../../../../utils/db';
import {
	polls,
	participants,
	responses,
	timeSlots,
} from '../../../../database/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	const participantId = getRouterParam(event, 'id');
	const body = await readBody(event);

	if (!slug || !participantId) {
		throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
	}

	const db = useDB();

	const poll = await db.select().from(polls).where(eq(polls.slug, slug)).get();
	if (!poll) {
		throw createError({ statusCode: 404, statusMessage: 'Poll not found' });
	}

	if (poll.closedAt) {
		throw createError({ statusCode: 403, statusMessage: 'Poll is closed' });
	}

	const participant = await db
		.select()
		.from(participants)
		.where(eq(participants.id, participantId))
		.get();

	if (!participant || participant.pollId !== poll.id) {
		throw createError({ statusCode: 404, statusMessage: 'Participant not found' });
	}

	if (body.name) {
		await db.update(participants)
			.set({ name: body.name })
			.where(eq(participants.id, participantId));
	}

	if (body.responses && Array.isArray(body.responses)) {
		const slots = await db
			.select()
			.from(timeSlots)
			.where(eq(timeSlots.pollId, poll.id))
			.all();
		const slotIds = new Set(slots.map((s) => s.id));

		await db.delete(responses)
			.where(eq(responses.participantId, participantId));

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
	}

	return { success: true };
});
