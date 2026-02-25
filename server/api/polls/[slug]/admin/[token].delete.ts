import { eq, and } from 'drizzle-orm';
import { useDB } from '../../../../utils/db';
import { polls } from '../../../../database/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	const token = getRouterParam(event, 'token');

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

	await db.delete(polls).where(eq(polls.id, poll.id));

	return { success: true };
});
