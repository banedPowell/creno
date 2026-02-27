import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
	pollsTable,
	slotsTable,
	participantsTable,
	votesTable,
} from '../db/schema';

export async function requirePollBySlug(slug: string) {
	const db = useDrizzle();
	const poll = await db
		.select()
		.from(pollsTable)
		.where(eq(pollsTable.slug, slug))
		.get();

	if (!poll) {
		throw createError({
			statusCode: 404,
			message: 'Sondage introuvable',
		});
	}

	return poll;
}

export async function createPoll(data: {
	title: string;
	description?: string | null;
	closedAt: Date;
	slots: { startTime: string; duration: number }[];
}) {
	const db = useDrizzle();
	const pollId = nanoid();

	const [poll] = await db
		.insert(pollsTable)
		.values({
			id: pollId,
			title: data.title,
			description: data.description || null,
			createdAt: new Date(),
			closedAt: data.closedAt,
		})
		.returning();

	const slots = await db
		.insert(slotsTable)
		.values(
			data.slots.map((slot) => ({
				pollId,
				startTime: new Date(slot.startTime),
				duration: slot.duration,
			})),
		)
		.returning();

	return { ...poll, slots };
}

export async function getPollWithSlots(pollId: string) {
	const db = useDrizzle();
	const slots = await db
		.select()
		.from(slotsTable)
		.where(eq(slotsTable.pollId, pollId))
		.all();

	return slots;
}

export async function getPollResults(pollId: string) {
	const db = useDrizzle();

	const slots = await db
		.select()
		.from(slotsTable)
		.where(eq(slotsTable.pollId, pollId))
		.all();

	const participants = await db
		.select()
		.from(participantsTable)
		.where(eq(participantsTable.pollId, pollId))
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

	return { participants, slots: slotsWithVotes };
}
