import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	participantsTable,
	slotsTable,
	votesTable,
} from '../../server/db/schema';

// Each table answers its own rows, whatever the filter: the query shape is
// drizzle's business, what is tested here is what comes out of it
const rows = new Map<unknown, unknown[]>();
const selected = new Map<unknown, object | undefined>();
const inserted = new Map<unknown, unknown>();

const db = {
	select: (fields?: object) => ({
		from: (table: unknown) => {
			selected.set(table, fields);
			return {
				where: () => ({ all: async () => rows.get(table) ?? [] }),
			};
		},
	}),
	insert: (table: unknown) => ({
		values: (values: unknown) => {
			inserted.set(table, values);
			return {
				returning: async (fields?: Record<string, unknown>) => {
					const list = (
						Array.isArray(values) ? values : [values]
					) as Record<string, unknown>[];
					if (!fields) return list;
					return list.map((row) =>
						Object.fromEntries(
							Object.keys(fields).map((key) => [key, row[key]]),
						),
					);
				},
			};
		},
	}),
};

beforeEach(() => {
	rows.clear();
	selected.clear();
	inserted.clear();
	vi.stubGlobal('useDrizzle', () => db);
});

const { getPollResults } = await import('../../server/utils/poll');
const { createParticipantWithVotes } =
	await import('../../server/utils/participant');

describe('getPollResults', () => {
	it('tells each slot who answered and how, and counts both answers', async () => {
		rows.set(slotsTable, [
			{ id: 's1', pollId: 'p', startTime: new Date(0), duration: 3600 },
			{ id: 's2', pollId: 'p', startTime: new Date(0), duration: 3600 },
		]);
		rows.set(participantsTable, [
			{ id: 'alice', name: 'Alice', pollId: 'p' },
			{ id: 'bob', name: 'Bob', pollId: 'p' },
		]);
		rows.set(votesTable, [
			{ id: 'v1', participantId: 'alice', slotId: 's1', status: 'yes' },
			{ id: 'v2', participantId: 'bob', slotId: 's1', status: 'maybe' },
			{ id: 'v3', participantId: 'bob', slotId: 's2', status: 'yes' },
		]);

		const { slots, participants } = await getPollResults('p');

		expect(slots[0]).toMatchObject({
			id: 's1',
			voters: [
				{ id: 'alice', name: 'Alice', status: 'yes' },
				{ id: 'bob', name: 'Bob', status: 'maybe' },
			],
			yesCount: 1,
			maybeCount: 1,
		});
		expect(slots[1]).toMatchObject({ yesCount: 1, maybeCount: 0 });
		expect(participants).toEqual([
			expect.objectContaining({ id: 'alice', voteCount: 1 }),
			expect.objectContaining({ id: 'bob', voteCount: 2 }),
		]);
	});

	it('leaves every slot empty before anyone answers', async () => {
		rows.set(slotsTable, [
			{ id: 's1', pollId: 'p', startTime: new Date(0), duration: 3600 },
		]);

		const { slots, participants } = await getPollResults('p');

		expect(participants).toEqual([]);
		expect(slots[0]).toMatchObject({
			voters: [],
			yesCount: 0,
			maybeCount: 0,
		});
	});

	it('never reads the edit tokens', async () => {
		await getPollResults('p');

		const fields = selected.get(participantsTable);
		expect(fields).toBeDefined();
		expect(fields).not.toHaveProperty('editToken');
		expect(Object.keys(fields!)).toEqual([
			'id',
			'name',
			'pollId',
			'createdAt',
		]);
	});
});

describe('createParticipantWithVotes', () => {
	it('hands out a fresh edit token with the new participant', async () => {
		rows.set(slotsTable, [{ id: 's1' }]);

		const result = await createParticipantWithVotes('p', 'Alice', [
			{ slotId: 's1', status: 'yes' },
		]);

		const participant = inserted.get(participantsTable) as {
			editToken: string;
		};
		expect(participant.editToken).toHaveLength(32);
		expect(result).toMatchObject({
			editToken: participant.editToken,
			votes: [expect.objectContaining({ slotId: 's1', status: 'yes' })],
		});
	});

	it('refuses a slot from another poll', async () => {
		rows.set(slotsTable, [{ id: 's1' }]);

		await expect(
			createParticipantWithVotes('p', 'Alice', [
				{ slotId: 'elsewhere', status: 'yes' },
			]),
		).rejects.toThrow('Créneaux invalides : elsewhere');
		expect(inserted.has(participantsTable)).toBe(false);
	});
});
