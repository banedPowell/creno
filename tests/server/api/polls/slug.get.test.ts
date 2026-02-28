import { describe, it, expect, vi } from 'vitest';
import type { MockEvent } from '../../mocks';
import {
	getRouterParam,
	requirePollBySlug,
	getPollWithSlots,
	createError,
} from '../../mocks';

const mockEvent: MockEvent = {};

describe('GET /api/polls/[slug]', () => {
	it('retourne 400 si le slug est manquant', async () => {
		vi.mocked(getRouterParam).mockReturnValue(undefined);

		const handler = (
			await import('../../../../server/api/polls/[slug].get')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow('Le slug est requis');
	});

	it('retourne le poll avec ses slots', async () => {
		const mockPoll = { id: 'poll-1', title: 'Test', slug: 'abc123' };
		const mockSlots = [
			{
				id: 'slot-1',
				pollId: 'poll-1',
				startTime: new Date('2030-01-01T09:00:00Z'),
				duration: 3600,
			},
		];

		vi.mocked(getRouterParam).mockReturnValue('abc123');
		vi.mocked(requirePollBySlug).mockResolvedValue(mockPoll);
		vi.mocked(getPollWithSlots).mockResolvedValue(mockSlots);

		const handler = (
			await import('../../../../server/api/polls/[slug].get')
		).default;
		const result = await handler(mockEvent);

		expect(requirePollBySlug).toHaveBeenCalledWith('abc123');
		expect(getPollWithSlots).toHaveBeenCalledWith('poll-1');
		expect(result).toEqual({ ...mockPoll, slots: mockSlots });
	});

	it("propage l'erreur 404 si le poll n'existe pas", async () => {
		vi.mocked(getRouterParam).mockReturnValue('inexistant');
		vi.mocked(requirePollBySlug).mockRejectedValue(
			createError({ statusCode: 404, message: 'Sondage introuvable' }),
		);

		const handler = (
			await import('../../../../server/api/polls/[slug].get')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow('Sondage introuvable');
	});
});
