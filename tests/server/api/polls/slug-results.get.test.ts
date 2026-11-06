import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockEvent } from '../../mocks';
import {
	getRouterParam,
	requirePollBySlug,
	getPollResults,
	getHeader,
	hasParticipantToken,
} from '../../mocks';

const mockEvent: MockEvent = {};

const loadHandler = async () =>
	(await import('../../../../server/api/polls/[slug]/results.get')).default;

const RESULTS = {
	participants: [
		{ id: 'p1', name: 'Ana', pollId: 'poll-1', createdAt: 0, voteCount: 2 },
	],
	slots: [
		{
			id: 's1',
			voters: [{ id: 'p1', name: 'Ana', status: 'yes' }],
			yesCount: 1,
			maybeCount: 1,
		},
	],
};

const headers = (values: Record<string, string>) =>
	vi
		.mocked(getHeader)
		.mockImplementation((_event, name: string) => values[name]);

describe('GET /api/polls/[slug]/results', () => {
	beforeEach(() => {
		vi.mocked(getHeader).mockReset();
		vi.mocked(hasParticipantToken).mockReset();
	});

	it('retourne 400 si le slug est manquant', async () => {
		vi.mocked(getRouterParam).mockReturnValue(undefined);

		const handler = await loadHandler();

		await expect(handler(mockEvent)).rejects.toThrow('Le slug est requis');
	});

	it('retourne les résultats sans exposer le token admin', async () => {
		const mockPoll = {
			id: 'poll-1',
			title: 'Test',
			slug: 'abc123',
			adminToken: 'secret-admin-token',
		};
		const mockResults = { participants: [], slots: [] };

		vi.mocked(getRouterParam).mockReturnValue('abc123');
		vi.mocked(requirePollBySlug).mockResolvedValue(mockPoll);
		vi.mocked(getPollResults).mockResolvedValue(mockResults);

		const handler = await loadHandler();
		const result = await handler(mockEvent);

		expect(getPollResults).toHaveBeenCalledWith('poll-1');
		expect(result).toEqual({
			id: 'poll-1',
			title: 'Test',
			slug: 'abc123',
			hasPassword: false,
			resultsHidden: false,
			...mockResults,
		});
		expect(result).not.toHaveProperty('adminToken');
	});

	describe('réponses masquées', () => {
		beforeEach(() => {
			vi.mocked(getRouterParam).mockReturnValue('abc123');
			vi.mocked(requirePollBySlug).mockResolvedValue({
				id: 'poll-1',
				adminToken: 'admin-token',
				hideResults: true,
			});
			vi.mocked(getPollResults).mockResolvedValue(RESULTS);
		});

		it('cache les réponses à qui n’a pas encore voté', async () => {
			vi.mocked(hasParticipantToken).mockResolvedValue(false);

			const result = await (await loadHandler())(mockEvent);

			expect(result.resultsHidden).toBe(true);
			expect(result.participants[0]).toMatchObject({
				name: 'Ana',
				voteCount: 0,
			});
			expect(result.slots[0]).toMatchObject({
				voters: [],
				yesCount: 0,
				maybeCount: 0,
			});
		});

		it('les montre à un participant qui prouve son vote', async () => {
			headers({ 'x-creno-token': 'vote-token' });
			vi.mocked(hasParticipantToken).mockResolvedValue(true);

			const result = await (await loadHandler())(mockEvent);

			expect(hasParticipantToken).toHaveBeenCalledWith(
				'poll-1',
				'vote-token',
			);
			expect(result.resultsHidden).toBe(false);
			expect(result.slots[0].yesCount).toBe(1);
		});

		it('les montre à tout le monde une fois le sondage terminé', async () => {
			vi.mocked(requirePollBySlug).mockResolvedValue({
				id: 'poll-1',
				adminToken: 'admin-token',
				hideResults: true,
				closedAt: '2020-01-01T00:00:00.000Z',
			});
			vi.mocked(hasParticipantToken).mockResolvedValue(false);

			const result = await (await loadHandler())(mockEvent);

			expect(result.resultsHidden).toBe(false);
			expect(result.slots[0].yesCount).toBe(1);
		});

		it('les montre à tout le monde quand un créneau est retenu', async () => {
			vi.mocked(requirePollBySlug).mockResolvedValue({
				id: 'poll-1',
				adminToken: 'admin-token',
				hideResults: true,
				closedAt: '2099-01-01T00:00:00.000Z',
				chosenSlotId: 's1',
			});
			vi.mocked(hasParticipantToken).mockResolvedValue(false);

			const result = await (await loadHandler())(mockEvent);

			expect(result.resultsHidden).toBe(false);
			expect(result.slots[0].voters).toHaveLength(1);
		});

		it('les montre toujours à l’organisateur', async () => {
			headers({ 'x-creno-admin': 'admin-token' });

			const result = await (await loadHandler())(mockEvent);

			expect(result.resultsHidden).toBe(false);
			expect(result.slots[0].voters).toHaveLength(1);
		});
	});
});
