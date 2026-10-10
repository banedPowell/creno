import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
	pollsTable,
	slotsTable,
	participantsTable,
	votesTable,
	type CreateSlotInput,
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
	slots: CreateSlotInput[];
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

	if (!poll) {
		throw createError({
			statusCode: 500,
			message: 'Le sondage n’a pas pu être créé',
		});
	}

	const slots = await db
		.insert(slotsTable)
		.values(
			data.slots.map((slot) => {
				const start = new Date(slot.start);
				const end = new Date(slot.end);
				return {
					pollId,
					startTime: start,
					duration: Math.round(
						(end.getTime() - start.getTime()) / 1000,
					),
				};
			}),
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

	// Picked one by one, the edit tokens must never leave the server
	const participants = await db
		.select({
			id: participantsTable.id,
			name: participantsTable.name,
			pollId: participantsTable.pollId,
			createdAt: participantsTable.createdAt,
		})
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

	const names = new Map(participants.map((p) => [p.id, p.name]));

	const slotsWithVotes = slots.map((slot) => {
		const voters = votes
			.filter((v) => v.slotId === slot.id && names.has(v.participantId))
			.map((v) => ({
				id: v.participantId,
				name: names.get(v.participantId)!,
				status: v.status,
			}));
		return {
			...slot,
			voters,
			yesCount: voters.filter((v) => v.status === 'yes').length,
			maybeCount: voters.filter((v) => v.status === 'maybe').length,
		};
	});

	const participantsWithCounts = participants.map((participant) => ({
		...participant,
		voteCount: votes.filter((v) => v.participantId === participant.id)
			.length,
	}));

	return { participants: participantsWithCounts, slots: slotsWithVotes };
}
