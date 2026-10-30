import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	participantsTable,
	pollsTable,
	slotsTable,
	votesTable,
	type Poll,
} from '../../server/db/schema';
import { verifyPassword } from '../../server/utils/password';

// Each table answers its own rows, whatever the filter, and every write is
// kept as it was built: what is tested is what the helpers ask drizzle for
type Write = {
	op: 'update' | 'insert' | 'delete';
	table: unknown;
	values?: Record<string, unknown> | Record<string, unknown>[];
};

const rows = new Map<unknown, Record<string, unknown>[]>();
let writes: Write[];
let batches: Write[][];
let selects: number;

const chain = (write: Write) => {
	const query = {
		...write,
		where: () => query,
		returning: async () => [write.values],
	};
	writes.push(query);
	return query;
};

const db = {
	select: () => ({
		from: (table: unknown) => ({
			where: () => {
				selects++;
				return {
					get: async () => rows.get(table)?.[0],
					all: async () => rows.get(table) ?? [],
				};
			},
		}),
	}),
	update: (table: unknown) => ({
		set: (values: Record<string, unknown>) =>
			chain({ op: 'update', table, values }),
	}),
	insert: (table: unknown) => ({
		values: (values: Record<string, unknown>[]) =>
			chain({ op: 'insert', table, values }),
	}),
	delete: (table: unknown) => chain({ op: 'delete', table }),
	batch: async (queries: Write[]) => {
		batches.push(
			queries.map(({ op, table, values }) => ({ op, table, values })),
		);
	},
};

const NOW = new Date('2030-01-01T10:00:00.000Z');

const POLL = {
	id: 'p',
	title: 'Réunion',
	description: null,
	slug: 'abc',
	adminToken: 'admin',
	createdAt: new Date('2029-12-30T10:00:00.000Z'),
	closedAt: new Date('2030-01-08T10:00:00.000Z'),
	votePolicy: 'token',
	hideResults: false,
	passwordHash: null,
	chosenSlotId: null,
} as Poll;

const slot = (id?: string) => ({
	...(id ? { id } : {}),
	start: '2030-01-02T09:00:00.000Z',
	end: '2030-01-02T10:30:00.000Z',
});

const tables = (batch: Write[]) =>
	batch.map(({ op, table }) => [
		op,
		table === pollsTable
			? 'polls'
			: table === slotsTable
				? 'slots'
				: table === votesTable
					? 'votes'
					: 'participants',
	]);

beforeEach(() => {
	rows.clear();
	writes = [];
	batches = [];
	selects = 0;
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	vi.stubGlobal('useDrizzle', () => db);
	vi.stubGlobal('getPollWithSlots', async () => rows.get(slotsTable) ?? []);
});

afterEach(() => {
	vi.useRealTimers();
});

const { updatePollSettings, replacePollSlots, deletePoll } =
	await import('../../server/utils/poll');
const { requireParticipant, hasParticipantToken, updateParticipantWithVotes } =
	await import('../../server/utils/participant');

const changes = () => writes.find((write) => write.op === 'update')?.values;

describe('updatePollSettings', () => {
	it('closes on the server clock, keeping the slot settled on', async () => {
		await updatePollSettings(POLL, { closedAt: 'now' });

		expect(changes()).toEqual({ closedAt: NOW });
	});

	it('forgets the slot settled on when the poll opens again', async () => {
		await updatePollSettings(
			{ ...POLL, chosenSlotId: 's1' },
			{ closedAt: '2030-01-10T21:59:59.999Z' },
		);

		expect(changes()).toEqual({
			closedAt: new Date('2030-01-10T21:59:59.999Z'),
			chosenSlotId: null,
		});
	});

	it('closes the poll when it settles on one of its slots', async () => {
		rows.set(slotsTable, [{ id: 's1' }]);

		await updatePollSettings(POLL, { chosenSlotId: 's1' });

		expect(changes()).toEqual({ closedAt: NOW, chosenSlotId: 's1' });
	});

	it('refuses to settle on a slot from another poll', async () => {
		await expect(
			updatePollSettings(POLL, { chosenSlotId: 'elsewhere' }),
		).rejects.toMatchObject({
			statusCode: 400,
			message: 'Ce créneau n’appartient pas au sondage',
		});
		expect(writes).toHaveLength(0);
	});

	it('takes the slot back without opening the poll again', async () => {
		await updatePollSettings(
			{ ...POLL, chosenSlotId: 's1' },
			{ chosenSlotId: null },
		);

		expect(changes()).toEqual({ chosenSlotId: null });
		expect(selects).toBe(0);
	});

	it('stores a hash of a new password, never the password itself', async () => {
		await updatePollSettings(POLL, { password: 'secret' });

		const { passwordHash } = changes() as { passwordHash: string };
		expect(passwordHash).not.toContain('secret');
		expect(verifyPassword('secret', passwordHash)).toBe(true);
	});

	it('takes the protection off with null', async () => {
		await updatePollSettings(
			{ ...POLL, passwordHash: 'scrypt:salt:hash' },
			{ password: null },
		);

		expect(changes()).toEqual({ passwordHash: null });
	});

	it('only writes the fields sent', async () => {
		await updatePollSettings(POLL, {
			title: 'Point hebdo',
			description: null,
			votePolicy: 'open',
			hideResults: true,
		});

		expect(changes()).toEqual({
			title: 'Point hebdo',
			description: null,
			votePolicy: 'open',
			hideResults: true,
		});
	});

	it('writes nothing when nothing changed', async () => {
		expect(await updatePollSettings(POLL, {})).toBe(POLL);
		expect(writes).toHaveLength(0);
	});
});

describe('replacePollSlots', () => {
	beforeEach(() => {
		rows.set(slotsTable, [{ id: 's1' }, { id: 's2' }]);
	});

	it('refuses an id that is not one of the poll’s slots', async () => {
		await expect(
			replacePollSlots(POLL, { slots: [slot('s1'), slot('elsewhere')] }),
		).rejects.toMatchObject({
			statusCode: 400,
			message: 'Créneaux invalides : elsewhere',
		});
		expect(batches).toHaveLength(0);
	});

	it('only counts the votes a dry run would drop', async () => {
		rows.set(votesTable, [{ id: 'v1' }, { id: 'v2' }]);

		const result = await replacePollSlots(POLL, {
			slots: [slot('s1')],
			dryRun: true,
		});

		expect(result).toEqual({ lostVotes: 2, slots: null });
		expect(batches).toHaveLength(0);
	});

	it('moves, adds and removes slots in one batch', async () => {
		rows.set(votesTable, [{ id: 'v1' }]);

		const result = await replacePollSlots(POLL, {
			slots: [slot('s1'), slot()],
		});

		expect(result.lostVotes).toBe(1);
		expect(batches).toHaveLength(1);
		const [batch] = batches;
		expect(tables(batch!)).toEqual([
			['update', 'slots'],
			['insert', 'slots'],
			['delete', 'votes'],
			['delete', 'slots'],
		]);
		expect(batch![0]!.values).toEqual({
			startTime: new Date('2030-01-02T09:00:00.000Z'),
			duration: 5400,
		});
		expect(batch![1]!.values).toEqual([
			expect.objectContaining({ pollId: 'p', duration: 5400 }),
		]);
	});

	it('forgets the slot settled on when it is removed', async () => {
		await replacePollSlots(
			{ ...POLL, chosenSlotId: 's2' },
			{ slots: [slot('s1')] },
		);

		expect(tables(batches[0]!).at(-1)).toEqual(['update', 'polls']);
		expect(batches[0]!.at(-1)!.values).toEqual({ chosenSlotId: null });
	});

	it('deletes nothing when every slot is kept', async () => {
		const result = await replacePollSlots(POLL, {
			slots: [slot('s1'), slot('s2')],
		});

		expect(result.lostVotes).toBe(0);
		expect(tables(batches[0]!)).toEqual([
			['update', 'slots'],
			['update', 'slots'],
		]);
	});
});

describe('deletePoll', () => {
	it('removes the votes, participants, slots, then the poll', async () => {
		await deletePoll('p');

		expect(tables(batches[0]!)).toEqual([
			['delete', 'votes'],
			['delete', 'participants'],
			['delete', 'slots'],
			['delete', 'polls'],
		]);
	});
});

describe('requireParticipant', () => {
	it('returns the participant of the poll', async () => {
		rows.set(participantsTable, [{ id: 'a', name: 'Alice' }]);

		expect(await requireParticipant('p', 'a')).toEqual({
			id: 'a',
			name: 'Alice',
		});
	});

	it('answers 404 for anyone else', async () => {
		await expect(requireParticipant('p', 'a')).rejects.toMatchObject({
			statusCode: 404,
			message: 'Participant introuvable',
		});
	});
});

describe('hasParticipantToken', () => {
	it('says no without a token, without asking the database', async () => {
		expect(await hasParticipantToken('p', undefined)).toBe(false);
		expect(selects).toBe(0);
	});

	it('says whether the token belongs to someone in the poll', async () => {
		expect(await hasParticipantToken('p', 'tok')).toBe(false);

		rows.set(participantsTable, [{ id: 'a' }]);
		expect(await hasParticipantToken('p', 'tok')).toBe(true);
	});
});

describe('updateParticipantWithVotes', () => {
	beforeEach(() => {
		rows.set(slotsTable, [{ id: 's1' }, { id: 's2' }]);
	});

	it('renames and replaces every vote in one batch', async () => {
		const result = await updateParticipantWithVotes('p', 'a', 'Alice B.', [
			{ slotId: 's2', status: 'maybe' },
		]);

		expect(tables(batches[0]!)).toEqual([
			['update', 'participants'],
			['delete', 'votes'],
			['insert', 'votes'],
		]);
		expect(batches[0]![0]!.values).toEqual({ name: 'Alice B.' });
		expect(batches[0]![2]!.values).toEqual([
			expect.objectContaining({
				participantId: 'a',
				slotId: 's2',
				status: 'maybe',
			}),
		]);
		expect(result).toEqual({
			id: 'a',
			name: 'Alice B.',
			votes: [{ slotId: 's2', status: 'maybe' }],
		});
	});

	it('only clears the votes of someone now absent everywhere', async () => {
		await updateParticipantWithVotes('p', 'a', 'Alice', []);

		expect(tables(batches[0]!)).toEqual([
			['update', 'participants'],
			['delete', 'votes'],
		]);
	});

	it('refuses a slot from another poll, writing nothing', async () => {
		await expect(
			updateParticipantWithVotes('p', 'a', 'Alice', [
				{ slotId: 'elsewhere', status: 'yes' },
			]),
		).rejects.toThrow('Créneaux invalides : elsewhere');
		expect(batches).toHaveLength(0);
	});
});
