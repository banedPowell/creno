import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
	slotsTable,
	participantsTable,
	votesTable,
} from '../db/schema';

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

export async function createParticipantWithVotes(
	pollId: string,
	name: string,
	votes: { slotId: string; status: 'yes' | 'maybe' }[],
) {
	const db = useDrizzle();

	await validateSlotIds(
		pollId,
		votes.map((v) => v.slotId),
	);

	const participantId = nanoid();

	const [participant] = await db
		.insert(participantsTable)
		.values({
			id: participantId,
			name,
			pollId,
		})
		.returning({ id: participantsTable.id });

	const insertedVotes =
		votes.length > 0
			? await db
					.insert(votesTable)
					.values(
						votes.map((vote) => ({
							id: nanoid(),
							participantId,
							slotId: vote.slotId,
							status: vote.status,
						})),
					)
					.returning()
			: [];

	return { ...participant, votes: insertedVotes };
}
