import { nanoid } from 'nanoid';
import { pollsTable, slotsTable } from '../db/schema';

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

	const db = useDrizzle();
	const pollId = nanoid(12);

	const [poll] = await db
		.insert(pollsTable)
		.values({
			id: pollId,
			title: body.title,
			description: body.description || null,
			pollDuration: body.pollDuration ?? 60 * 60 * 24,
		})
		.returning();

	const slots = await db
		.insert(slotsTable)
		.values(
			body.slots.map((slot: { startTime: string; duration: number }) => ({
				pollId,
				startTime: new Date(slot.startTime),
				duration: slot.duration,
			})),
		)
		.returning();

	setResponseStatus(event, 201);
	return { ...poll, slots };
});
