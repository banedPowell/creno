import { describe, it, expect, vi } from 'vitest';
import type { MockEvent } from '../../mocks';
import { getRouterParam, requirePollBySlug, getPollResults } from '../../mocks';

const mockEvent: MockEvent = {};

describe('GET /api/polls/[slug]/results', () => {
	it('retourne 400 si le slug est manquant', async () => {
		vi.mocked(getRouterParam).mockReturnValue(undefined);

		const handler = (
			await import('../../../../server/api/polls/[slug]/results.get')
		).default;

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

		const handler = (
			await import('../../../../server/api/polls/[slug]/results.get')
		).default;
		const result = await handler(mockEvent);

		expect(getPollResults).toHaveBeenCalledWith('poll-1');
		expect(result).toEqual({
			id: 'poll-1',
			title: 'Test',
			slug: 'abc123',
			...mockResults,
		});
		expect(result).not.toHaveProperty('adminToken');
	});
});
