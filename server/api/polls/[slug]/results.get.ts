import { eq, inArray } from 'drizzle-orm';
import { pollsTable, slotsTable, participantsTable, votesTable } from '../../../db/schema';

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

	const participants = await db
		.select()
		.from(participantsTable)
		.where(eq(participantsTable.pollId, poll.id))
		.all();

	const participantIds = participants.map((p) => p.id);

	const votes =
		participantIds.length > 0
			? await db
					.select()
					.from(votesTable)
					.where(inArray(votesTable.participantId, participantIds))
					.all()
			: [];

	const slotsWithVotes = slots.map((slot) => {
		const slotVotes = votes.filter((v) => v.slotId === slot.id);
		const voterIds = new Set(slotVotes.map((v) => v.participantId));
		return {
			...slot,
			voters: participants.filter((p) => voterIds.has(p.id)),
			voteCount: slotVotes.length,
		};
	});

	return {
		...poll,
		participants,
		slots: slotsWithVotes,
	};
});
