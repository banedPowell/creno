import { describe, it, expect, vi } from 'vitest';
import type { MockEvent } from '../../mocks';
import {
	getRouterParam,
	readBody,
	requirePollBySlug,
	createParticipantWithVotes,
	setResponseStatus,
} from '../../mocks';

const mockEvent: MockEvent = {};

const futureDate = new Date('2030-12-31T23:59:59Z');
const pastDate = new Date('2020-01-01T00:00:00Z');

describe('POST /api/polls/[slug]/vote', () => {
	it('retourne 400 si le slug est manquant', async () => {
		vi.mocked(getRouterParam).mockReturnValue(undefined);

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow('Le slug est requis');
	});

	it('retourne 400 si le nom est manquant', async () => {
		vi.mocked(getRouterParam).mockReturnValue('test-slug');
		vi.mocked(readBody).mockResolvedValue({ votes: [] });

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Le nom du participant est requis',
		);
	});

	it("retourne 400 si le nom n'est pas une string", async () => {
		vi.mocked(getRouterParam).mockReturnValue('test-slug');
		vi.mocked(readBody).mockResolvedValue({ name: 42, votes: [] });

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Le nom du participant est requis',
		);
	});

	it('retourne 400 si un vote a un slotId invalide', async () => {
		vi.mocked(getRouterParam).mockReturnValue('test-slug');
		vi.mocked(readBody).mockResolvedValue({
			name: 'Alice',
			votes: [{ slotId: 123, status: 'yes' }],
		});

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Chaque vote doit contenir un slotId valide',
		);
	});

	it('retourne 400 si un vote a un statut invalide', async () => {
		vi.mocked(getRouterParam).mockReturnValue('test-slug');
		vi.mocked(readBody).mockResolvedValue({
			name: 'Alice',
			votes: [{ slotId: 'slot-1', status: 'no' }],
		});

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Statut invalide "no"',
		);
	});

	it('retourne 410 si le sondage est fermé', async () => {
		vi.mocked(getRouterParam).mockReturnValue('test-slug');
		vi.mocked(readBody).mockResolvedValue({ name: 'Alice', votes: [] });
		vi.mocked(requirePollBySlug).mockResolvedValue({
			id: 'poll-1',
			slug: 'test-slug',
			closedAt: pastDate,
		});

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Ce sondage est fermé',
		);
	});

	it('crée les votes et retourne 201', async () => {
		const mockResult = {
			id: 'participant-1',
			votes: [{ id: 'vote-1', slotId: 'slot-1', status: 'yes' }],
		};

		vi.mocked(getRouterParam).mockReturnValue('test-slug');
		vi.mocked(readBody).mockResolvedValue({
			name: 'Alice',
			votes: [{ slotId: 'slot-1', status: 'yes' }],
		});
		vi.mocked(requirePollBySlug).mockResolvedValue({
			id: 'poll-1',
			slug: 'test-slug',
			closedAt: futureDate,
		});
		vi.mocked(createParticipantWithVotes).mockResolvedValue(mockResult);

		const handler = (
			await import('../../../../server/api/polls/[slug]/vote.post')
		).default;
		const result = await handler(mockEvent);

		expect(requirePollBySlug).toHaveBeenCalledWith('test-slug');
		expect(createParticipantWithVotes).toHaveBeenCalledWith(
			'poll-1',
			'Alice',
			[{ slotId: 'slot-1', status: 'yes' }],
		);
		expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 201);
		expect(result).toEqual(mockResult);
	});
});
