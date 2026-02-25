import { nanoid } from 'nanoid';
import { useDB } from '../../utils/db';
import { polls, timeSlots } from '../../database/schema';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);

	if (!body.title || !body.slots || !Array.isArray(body.slots) || body.slots.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Title and at least one time slot are required',
		});
	}

	const db = useDB();
	const pollId = nanoid();
	const slug = nanoid(10);
	const adminToken = nanoid(20);
	const slotDuration = body.slotDuration || 60;

	await db.insert(polls)
		.values({
			id: pollId,
			title: body.title,
			description: body.description || null,
			slug,
			adminToken,
			slotDuration,
		});

	for (const slot of body.slots) {
		await db.insert(timeSlots)
			.values({
				id: nanoid(),
				pollId,
				date: slot.date,
				startTime: slot.startTime,
				endTime: slot.endTime,
			});
	}

	return {
		slug,
		adminToken,
	};
});
