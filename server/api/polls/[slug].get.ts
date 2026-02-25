import { eq } from 'drizzle-orm';
import { useDB } from '../../utils/db';
import {
	polls,
	timeSlots,
	participants,
	responses,
} from '../../database/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	if (!slug) {
		throw createError({ statusCode: 400, statusMessage: 'Slug is required' });
	}

	const db = useDB();

	const poll = await db.select().from(polls).where(eq(polls.slug, slug)).get();

	if (!poll) {
		throw createError({ statusCode: 404, statusMessage: 'Poll not found' });
	}

	const slots = await db
		.select()
		.from(timeSlots)
		.where(eq(timeSlots.pollId, poll.id))
		.all();

	const participantList = await db
		.select()
		.from(participants)
		.where(eq(participants.pollId, poll.id))
		.all();

	const participantIds = participantList.map((p) => p.id);

	let responseList: (typeof responses.$inferSelect)[] = [];
	if (participantIds.length > 0) {
		responseList = (await db.select().from(responses).all()).filter(
			(r) => participantIds.includes(r.participantId),
		);
	}

	return {
		poll: {
			id: poll.id,
			title: poll.title,
			description: poll.description,
			slug: poll.slug,
			slotDuration: poll.slotDuration,
			createdAt: poll.createdAt,
			closedAt: poll.closedAt,
		},
		slots: slots.sort((a, b) => {
			if (a.date !== b.date) return a.date.localeCompare(b.date);
			return a.startTime.localeCompare(b.startTime);
		}),
		participants: participantList,
		responses: responseList,
	};
});
