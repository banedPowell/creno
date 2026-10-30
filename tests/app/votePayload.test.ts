import { describe, it, expect } from 'vitest';
import {
	buildVotePayload,
	NAME_MAX_LENGTH,
} from '../../shared/utils/votePayload';
import { bestSlotIds } from '../../app/utils/pollResults';

describe('buildVotePayload', () => {
	it('sends a trimmed name and only the slots answered', () => {
		expect(
			buildVotePayload({
				name: '  Alice  ',
				votes: { s1: 'yes', s2: 'maybe' },
			}),
		).toEqual({
			success: true,
			data: {
				name: 'Alice',
				votes: [
					{ slotId: 's1', status: 'yes' },
					{ slotId: 's2', status: 'maybe' },
				],
			},
		});
	});

	it('accepts someone absent everywhere', () => {
		const result = buildVotePayload({ name: 'Alice', votes: {} });
		expect(result.success && result.data.votes).toEqual([]);
	});

	it('asks for a name first', () => {
		for (const name of [undefined, '', '   ']) {
			expect(buildVotePayload({ name, votes: { s1: 'yes' } })).toEqual({
				success: false,
				issues: [{ path: 'name', message: 'Indiquez votre nom' }],
			});
		}
	});

	it('caps the length of the name', () => {
		const result = buildVotePayload({
			name: 'a'.repeat(NAME_MAX_LENGTH + 1),
			votes: {},
		});
		expect(result.success).toBe(false);
		expect(!result.success && result.issues[0]!.message).toBe(
			`Le nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères`,
		);
	});
});

describe('bestSlotIds', () => {
	const tally = (id: string, yesCount: number, maybeCount = 0) => ({
		id,
		yesCount,
		maybeCount,
	});

	it('picks nothing before anyone answers', () => {
		expect(bestSlotIds([tally('a', 0), tally('b', 0)])).toEqual([]);
	});

	it('picks the slot with the most yes', () => {
		expect(bestSlotIds([tally('a', 1, 3), tally('b', 2)])).toEqual(['b']);
	});

	it('breaks a tie on yes with the maybes', () => {
		expect(bestSlotIds([tally('a', 2, 1), tally('b', 2, 0)])).toEqual([
			'a',
		]);
	});

	it('keeps every slot still level', () => {
		expect(
			bestSlotIds([tally('a', 2, 1), tally('b', 2, 1), tally('c', 1)]),
		).toEqual(['a', 'b']);
	});

	it('lets maybes lead when nobody said yes', () => {
		expect(bestSlotIds([tally('a', 0, 1), tally('b', 0, 2)])).toEqual([
			'b',
		]);
	});
});
