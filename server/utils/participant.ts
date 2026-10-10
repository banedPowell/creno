import { and, eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { nanoid } from 'nanoid';
import { slotsTable, participantsTable, votesTable } from '../db/schema';

type VoteInput = { slotId: string; status: 'yes' | 'maybe' };

export async function validateSlotIds(pollId: string, slotIds: string[]) {
	if (slotIds.length === 0) return;

	const db = useDrizzle();
	const validSlots = await db
		.select({ id: slotsTable.id })
		.from(slotsTable)
		.where(eq(slotsTable.pollId, pollId))
		.all();

	const validSlotIds = new Set(validSlots.map((s) => s.id));
	const invalidSlotIds = slotIds.filter((id) => !validSlotIds.has(id));

	if (invalidSlotIds.length > 0) {
		throw createError({
			statusCode: 400,
			message: `Créneaux invalides : ${invalidSlotIds.join(', ')}`,
		});
	}
}

export async function requireParticipant(
	pollId: string,
	participantId: string,
) {
	const db = useDrizzle();
	const participant = await db
		.select()
		.from(participantsTable)
		.where(
			and(
				eq(participantsTable.id, participantId),
				eq(participantsTable.pollId, pollId),
			),
		)
		.get();

	if (!participant) {
		throw createError({
			statusCode: 404,
			message: 'Participant introuvable',
		});
	}

	return participant;
}

const voteRows = (participantId: string, votes: VoteInput[]) =>
	votes.map((vote) => ({
		id: nanoid(),
		participantId,
		slotId: vote.slotId,
		status: vote.status,
	}));

export async function createParticipantWithVotes(
	pollId: string,
	name: string,
	votes: VoteInput[],
) {
	const db = useDrizzle();

	await validateSlotIds(
		pollId,
		votes.map((v) => v.slotId),
	);

	const participantId = nanoid();

	// The only time the token leaves the server, the browser keeps it to
	// change this answer later
	const [participant] = await db
		.insert(participantsTable)
		.values({
			id: participantId,
			name,
			pollId,
			editToken: nanoid(32),
		})
		.returning({
			id: participantsTable.id,
			editToken: participantsTable.editToken,
		});

	const insertedVotes =
		votes.length > 0
			? await db
					.insert(votesTable)
					.values(voteRows(participantId, votes))
					.returning()
			: [];

	return { ...participant, votes: insertedVotes };
}

// Replaces the whole answer at once, a half-applied change would leave the
// participant with someone else's mix of old and new votes
export async function updateParticipantWithVotes(
	pollId: string,
	participantId: string,
	name: string,
	votes: VoteInput[],
) {
	const db = useDrizzle();

	await validateSlotIds(
		pollId,
		votes.map((v) => v.slotId),
	);

	const queries: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] = [
		db
			.update(participantsTable)
			.set({ name })
			.where(eq(participantsTable.id, participantId)),
		db
			.delete(votesTable)
			.where(eq(votesTable.participantId, participantId)),
	];
	if (votes.length > 0)
		queries.push(
			db.insert(votesTable).values(voteRows(participantId, votes)),
		);

	await db.batch(queries);

	return { id: participantId, name, votes };
}
