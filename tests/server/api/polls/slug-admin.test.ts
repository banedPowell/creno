import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockEvent } from '../../mocks';
import {
	getRouterParam,
	readBody,
	getHeader,
	requirePollBySlug,
	getPollResults,
	updatePollSettings,
	replacePollSlots,
	deletePoll,
	setResponseStatus,
} from '../../mocks';

const mockEvent: MockEvent = {};

const POLL = {
	id: 'poll-1',
	slug: 'abc123',
	title: 'Test',
	adminToken: 'admin-token',
	passwordHash: 'scrypt:salt:hash',
	hideResults: true,
};

const asAdmin = (token = 'admin-token') =>
	vi
		.mocked(getHeader)
		.mockImplementation((_event, name: string) =>
			name === 'x-creno-admin' ? token : undefined,
		);

const SLOTS = [
	{
		id: 's1',
		start: '2030-01-01T09:00:00.000Z',
		end: '2030-01-01T10:00:00.000Z',
	},
	{ start: '2030-01-02T09:00:00.000Z', end: '2030-01-02T10:00:00.000Z' },
];

describe('routes organisateur', () => {
	beforeEach(() => {
		vi.mocked(getHeader).mockReset();
		vi.mocked(getRouterParam).mockReturnValue('abc123');
		vi.mocked(requirePollBySlug).mockResolvedValue(POLL);
	});

	describe('PATCH /api/polls/[slug]', () => {
		const load = async () =>
			(await import('../../../../server/api/polls/[slug].patch')).default;

		it.each([undefined, 'mauvais'])(
			'refuse sans le bon token admin (%s)',
			async (token) => {
				if (token) asAdmin(token);
				vi.mocked(readBody).mockResolvedValue({ title: 'Nouveau' });

				await expect((await load())(mockEvent)).rejects.toMatchObject({
					statusCode: 403,
				});
				expect(updatePollSettings).not.toHaveBeenCalled();
			},
		);

		it('applique les réglages et ne renvoie aucun secret', async () => {
			asAdmin();
			vi.mocked(readBody).mockResolvedValue({
				title: '  Nouveau  ',
				description: '',
				closedAt: 'now',
				password: null,
				chosenSlotId: 's1',
			});
			vi.mocked(updatePollSettings).mockResolvedValue({
				...POLL,
				title: 'Nouveau',
			});

			const result = await (await load())(mockEvent);

			expect(updatePollSettings).toHaveBeenCalledWith(POLL, {
				title: 'Nouveau',
				description: null,
				closedAt: 'now',
				password: null,
				chosenSlotId: 's1',
			});
			expect(result).toMatchObject({
				title: 'Nouveau',
				hasPassword: true,
			});
			expect(result).not.toHaveProperty('adminToken');
			expect(result).not.toHaveProperty('passwordHash');
		});

		it.each([
			[{ title: 'a' }, 'Ajoutez un titre'],
			[{ closedAt: 'demain' }, 'Date de clôture invalide'],
			[{ password: 'ab' }, 'au moins 4 caractères'],
			[{ votePolicy: 'admin' }, 'Politique de vote invalide'],
		])('refuse un réglage invalide (%o)', async (body, message) => {
			asAdmin();
			vi.mocked(readBody).mockResolvedValue(body);

			await expect((await load())(mockEvent)).rejects.toThrow(message);
		});
	});

	describe('DELETE /api/polls/[slug]', () => {
		const load = async () =>
			(await import('../../../../server/api/polls/[slug].delete'))
				.default;

		it('refuse sans token admin', async () => {
			await expect((await load())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
			});
			expect(deletePoll).not.toHaveBeenCalled();
		});

		it('supprime le sondage', async () => {
			asAdmin();

			await (
				await load()
			)(mockEvent);

			expect(deletePoll).toHaveBeenCalledWith('poll-1');
			expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 204);
		});
	});

	describe('GET /api/polls/[slug]/admin', () => {
		const load = async () =>
			(await import('../../../../server/api/polls/[slug]/admin.get'))
				.default;

		it('refuse sans token admin', async () => {
			await expect((await load())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
			});
		});

		it('renvoie toutes les réponses, même masquées', async () => {
			asAdmin();
			const results = {
				participants: [],
				slots: [{ id: 's1', voters: [{ id: 'p1' }], yesCount: 1 }],
			};
			vi.mocked(getPollResults).mockResolvedValue(results);

			const result = await (await load())(mockEvent);

			expect(result).toMatchObject({ ...results, resultsHidden: false });
			expect(result).not.toHaveProperty('adminToken');
		});
	});

	describe('PUT /api/polls/[slug]/slots', () => {
		const load = async () =>
			(await import('../../../../server/api/polls/[slug]/slots.put'))
				.default;

		it('refuse sans token admin', async () => {
			vi.mocked(readBody).mockResolvedValue({ slots: SLOTS });

			await expect((await load())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
			});
			expect(replacePollSlots).not.toHaveBeenCalled();
		});

		it('transmet les créneaux et le dryRun', async () => {
			asAdmin();
			vi.mocked(readBody).mockResolvedValue({
				slots: SLOTS,
				dryRun: true,
			});
			vi.mocked(replacePollSlots).mockResolvedValue({
				lostVotes: 3,
				slots: null,
			});

			const result = await (await load())(mockEvent);

			expect(replacePollSlots).toHaveBeenCalledWith(POLL, {
				slots: SLOTS,
				dryRun: true,
			});
			expect(result).toEqual({ lostVotes: 3, slots: null });
		});

		it.each([
			[{ slots: [] }, 'Gardez au moins un créneau'],
			[
				{
					slots: [
						{
							start: '2030-01-01T09:00:00.000Z',
							end: '2030-01-01T09:05:00.000Z',
						},
					],
				},
				'au moins 15 minutes',
			],
		])('refuse des créneaux invalides (%#)', async (body, message) => {
			asAdmin();
			vi.mocked(readBody).mockResolvedValue(body);

			await expect((await load())(mockEvent)).rejects.toThrow(message);
		});
	});
});

describe('hachage du mot de protection', () => {
	it('vérifie le bon mot et rejette les autres', async () => {
		const { hashPassword, verifyPassword } =
			await import('../../../../server/utils/password');
		const stored = hashPassword('sésame');

		expect(stored).not.toContain('sésame');
		expect(verifyPassword('sésame', stored)).toBe(true);
		expect(verifyPassword('sesame', stored)).toBe(false);
		expect(verifyPassword('sésame', 'n’importe quoi')).toBe(false);
		expect(hashPassword('sésame')).not.toBe(stored);
	});
});
