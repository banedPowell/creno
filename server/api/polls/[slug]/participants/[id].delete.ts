import { eq } from 'drizzle-orm';
import { useDB } from '../../../../utils/db';
import { polls, participants } from '../../../../database/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	const participantId = getRouterParam(event, 'id');

	if (!slug || !participantId) {
		throw createError({ statusCode: 400, statusMessage: 'Missing parameters' });
	}

	const db = useDB();

	const poll = db.select().from(polls).where(eq(polls.slug, slug)).get();
	if (!poll) {
		throw createError({ statusCode: 404, statusMessage: 'Poll not found' });
	}

	const participant = db
		.select()
		.from(participants)
		.where(eq(participants.id, participantId))
		.get();

	if (!participant || participant.pollId !== poll.id) {
		throw createError({ statusCode: 404, statusMessage: 'Participant not found' });
	}

	db.delete(participants)
		.where(eq(participants.id, participantId))
		.run();

	return { success: true };
});
