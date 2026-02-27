import { eq } from 'drizzle-orm';
import { pollsTable, slotsTable } from '../../db/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const db = useDrizzle();

	const poll = await db.select().from(pollsTable).where(eq(pollsTable.slug, slug)).get();

	if (!poll) {
		throw createError({
			statusCode: 404,
			message: 'Sondage introuvable',
		});
	}

	const slots = await db
		.select()
		.from(slotsTable)
		.where(eq(slotsTable.pollId, poll.id))
		.all();

	return { ...poll, slots };
});
