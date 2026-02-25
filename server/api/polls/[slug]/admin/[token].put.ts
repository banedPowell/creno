import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { useDB } from '../../../../utils/db';
import { polls, timeSlots } from '../../../../database/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	const token = getRouterParam(event, 'token');
	const body = await readBody(event);

	if (!slug || !token) {
		throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
	}

	const db = useDB();

	const poll = await db
		.select()
		.from(polls)
		.where(and(eq(polls.slug, slug), eq(polls.adminToken, token)))
		.get();

	if (!poll) {
		throw createError({ statusCode: 404, statusMessage: 'Poll not found or invalid admin token' });
	}

	if (body.title !== undefined || body.description !== undefined || body.closedAt !== undefined) {
		await db.update(polls)
			.set({
				...(body.title !== undefined && { title: body.title }),
				...(body.description !== undefined && { description: body.description }),
				...(body.closedAt !== undefined && {
					closedAt: body.closedAt ? new Date(body.closedAt) : null,
				}),
			})
			.where(eq(polls.id, poll.id));
	}

	if (body.slots && Array.isArray(body.slots)) {
		await db.delete(timeSlots).where(eq(timeSlots.pollId, poll.id));

		for (const slot of body.slots) {
			await db.insert(timeSlots)
				.values({
					id: nanoid(),
					pollId: poll.id,
					date: slot.date,
					startTime: slot.startTime,
					endTime: slot.endTime,
				});
		}
	}

	return { success: true };
});
