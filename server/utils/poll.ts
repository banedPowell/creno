import { and, eq, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { nanoid } from 'nanoid';
import {
	pollsTable,
	slotsTable,
	participantsTable,
	votesTable,
	type CreateSlotInput,
	type Poll,
	type VotePolicy,
} from '../db/schema';
import type {
	PollSettings,
	SlotsUpdate,
} from '../../shared/utils/pollSettings';
import { hashPassword } from './password';

const slotRow = (slot: CreateSlotInput) => {
	const start = new Date(slot.start);
	const end = new Date(slot.end);
	return {
		startTime: start,
		duration: Math.round((end.getTime() - start.getTime()) / 1000),
	};
};

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
	votePolicy?: VotePolicy;
	hideResults?: boolean;
	password?: string;
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
			votePolicy: data.votePolicy ?? 'token',
			hideResults: data.hideResults ?? false,
			passwordHash: data.password ? hashPassword(data.password) : null,
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
		.values(data.slots.map((slot) => ({ pollId, ...slotRow(slot) })))
		.returning();

	return { ...poll, slots };
}

// Applies what the admin changed. Settling on a slot closes the poll, and
// opening it again forgets the slot it had settled on
export async function updatePollSettings(poll: Poll, settings: PollSettings) {
	const db = useDrizzle();
	const now = new Date();
	const changes: Partial<typeof pollsTable.$inferInsert> = {};

	if (settings.title !== undefined) changes.title = settings.title;
	if (settings.description !== undefined)
		changes.description = settings.description;
	if (settings.votePolicy !== undefined)
		changes.votePolicy = settings.votePolicy;
	if (settings.hideResults !== undefined)
		changes.hideResults = settings.hideResults;
	if (settings.password !== undefined)
		changes.passwordHash = settings.password
			? hashPassword(settings.password)
			: null;

	if (settings.closedAt !== undefined) {
		changes.closedAt =
			settings.closedAt === 'now' ? now : new Date(settings.closedAt);
		if (changes.closedAt > now) changes.chosenSlotId = null;
	}

	if (settings.chosenSlotId !== undefined) {
		if (settings.chosenSlotId) {
			const slot = await db
				.select({ id: slotsTable.id })
				.from(slotsTable)
				.where(
					and(
						eq(slotsTable.id, settings.chosenSlotId),
						eq(slotsTable.pollId, poll.id),
					),
				)
				.get();
			if (!slot)
				throw createError({
					statusCode: 400,
					message: 'Ce créneau n’appartient pas au sondage',
				});
			changes.closedAt = now;
		}
		changes.chosenSlotId = settings.chosenSlotId;
	}

	if (Object.keys(changes).length === 0) return poll;

	const [updated] = await db
		.update(pollsTable)
		.set(changes)
		.where(eq(pollsTable.id, poll.id))
		.returning();

	return updated ?? poll;
}

const countVotesOn = async (slotIds: string[]) => {
	if (slotIds.length === 0) return 0;
	const db = useDrizzle();
	const votes = await db
		.select({ id: votesTable.id })
		.from(votesTable)
		.where(inArray(votesTable.slotId, slotIds))
		.all();
	return votes.length;
};

// The whole list at once: a slot sent with its id is moved and keeps its
// votes, one without is new, one left out goes with its votes
export async function replacePollSlots(poll: Poll, update: SlotsUpdate) {
	const db = useDrizzle();
	const existing = await db
		.select({ id: slotsTable.id })
		.from(slotsTable)
		.where(eq(slotsTable.pollId, poll.id))
		.all();
	const existingIds = new Set(existing.map((slot) => slot.id));

	const unknown = update.slots
		.filter((slot) => slot.id && !existingIds.has(slot.id))
		.map((slot) => slot.id);
	if (unknown.length > 0)
		throw createError({
			statusCode: 400,
			message: `Créneaux invalides : ${unknown.join(', ')}`,
		});

	const keptIds = new Set(update.slots.flatMap((slot) => slot.id ?? []));
	const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
	const lostVotes = await countVotesOn(removedIds);

	if (update.dryRun) return { lostVotes, slots: null };

	const queries: BatchItem<'sqlite'>[] = [];
	for (const slot of update.slots) {
		if (slot.id)
			queries.push(
				db
					.update(slotsTable)
					.set(slotRow(slot))
					.where(eq(slotsTable.id, slot.id)),
			);
	}
	const added = update.slots.filter((slot) => !slot.id);
	if (added.length > 0)
		queries.push(
			db.insert(slotsTable).values(
				added.map((slot) => ({
					id: nanoid(12),
					pollId: poll.id,
					...slotRow(slot),
				})),
			),
		);
	if (removedIds.length > 0) {
		queries.push(
			db.delete(votesTable).where(inArray(votesTable.slotId, removedIds)),
			db.delete(slotsTable).where(inArray(slotsTable.id, removedIds)),
		);
		if (poll.chosenSlotId && removedIds.includes(poll.chosenSlotId))
			queries.push(
				db
					.update(pollsTable)
					.set({ chosenSlotId: null })
					.where(eq(pollsTable.id, poll.id)),
			);
	}

	if (queries.length > 0)
		await db.batch(
			queries as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]],
		);

	return { lostVotes, slots: await getPollWithSlots(poll.id) };
}

// Spelled out rather than left to ON DELETE CASCADE, which SQLite only
// honours when foreign keys are switched on for the connection
export async function deletePoll(pollId: string) {
	const db = useDrizzle();
	const slotIds = db
		.select({ id: slotsTable.id })
		.from(slotsTable)
		.where(eq(slotsTable.pollId, pollId));
	await db.batch([
		db.delete(votesTable).where(inArray(votesTable.slotId, slotIds)),
		db
			.delete(participantsTable)
			.where(eq(participantsTable.pollId, pollId)),
		db.delete(slotsTable).where(eq(slotsTable.pollId, pollId)),
		db.delete(pollsTable).where(eq(pollsTable.id, pollId)),
	]);
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

type PollResults = Awaited<ReturnType<typeof getPollResults>>;

// Who answered stays visible, not how: the visitor answers before seeing
// which way the others lean
export const hidePollResults = (results: PollResults): PollResults => ({
	participants: results.participants.map((participant) => ({
		...participant,
		voteCount: 0,
	})),
	slots: results.slots.map((slot) => ({
		...slot,
		voters: [],
		yesCount: 0,
		maybeCount: 0,
	})),
});
