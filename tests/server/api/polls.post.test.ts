import { describe, it, expect, vi } from 'vitest';
import type { MockEvent } from '../mocks';
import { readBody, createPoll, setResponseStatus } from '../mocks';

const mockEvent: MockEvent = {};

describe('POST /api/polls/create', () => {
	it('retourne 400 si le titre est manquant', async () => {
		vi.mocked(readBody).mockResolvedValue({
			slots: [
				{
					start: '2030-01-01T09:00:00.000Z',
					end: '2030-01-01T10:00:00.000Z',
				},
			],
		});

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;

		await expect(handler(mockEvent)).rejects.toThrow('Le titre est requis');
	});

	it("retourne 400 si le titre n'est pas une string", async () => {
		vi.mocked(readBody).mockResolvedValue({
			title: 123,
			slots: [
				{
					start: '2030-01-01T09:00:00.000Z',
					end: '2030-01-01T10:00:00.000Z',
				},
			],
		});

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;

		await expect(handler(mockEvent)).rejects.toThrow('Le titre est requis');
	});

	it('retourne 400 si slots est vide', async () => {
		vi.mocked(readBody).mockResolvedValue({ title: 'Test', slots: [] });

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Au moins un créneau est requis',
		);
	});

	it("retourne 400 si slots n'est pas un tableau", async () => {
		vi.mocked(readBody).mockResolvedValue({
			title: 'Test',
			slots: 'invalid',
		});

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'Au moins un créneau est requis',
		);
	});

	it('retourne 400 si closedAt est dans le passé', async () => {
		vi.mocked(readBody).mockResolvedValue({
			title: 'Test',
			slots: [
				{
					start: '2030-01-01T09:00:00.000Z',
					end: '2030-01-01T10:00:00.000Z',
				},
			],
			closedAt: '2020-01-01T00:00:00Z',
		});

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;

		await expect(handler(mockEvent)).rejects.toThrow(
			'La date de fermeture doit être dans le futur',
		);
	});

	it('crée un poll avec closedAt par défaut si non fourni', async () => {
		const mockPoll = { id: 'poll-1', title: 'Test', slug: 'abc123' };
		const slots = [
			{
				start: '2030-01-01T09:00:00.000Z',
				end: '2030-01-01T10:00:00.000Z',
			},
		];
		vi.mocked(readBody).mockResolvedValue({
			title: 'Test',
			slots,
		});
		vi.mocked(createPoll).mockResolvedValue(mockPoll);

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;
		const result = await handler(mockEvent);

		expect(createPoll).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Test',
				closedAt: expect.any(Date),
				slots,
			}),
		);
		expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 201);
		expect(result).toEqual({ ...mockPoll, hasPassword: false });
	});

	it('crée un poll avec closedAt explicite', async () => {
		const mockPoll = { id: 'poll-1', title: 'Test', slug: 'abc123' };
		const slots = [
			{
				start: '2030-01-01T09:00:00.000Z',
				end: '2030-01-01T10:00:00.000Z',
			},
		];
		vi.mocked(readBody).mockResolvedValue({
			title: 'Test',
			description: 'Une description',
			slots,
			closedAt: '2030-06-01T00:00:00Z',
		});
		vi.mocked(createPoll).mockResolvedValue(mockPoll);

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;
		const result = await handler(mockEvent);

		expect(createPoll).toHaveBeenCalledWith({
			title: 'Test',
			description: 'Une description',
			closedAt: new Date('2030-06-01T00:00:00Z'),
			slots,
		});
		expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 201);
		expect(result).toEqual({ ...mockPoll, hasPassword: false });
	});

	it('transmet les options avancées sans renvoyer le hash', async () => {
		const slots = [
			{
				start: '2030-01-01T09:00:00.000Z',
				end: '2030-01-01T10:00:00.000Z',
			},
		];
		vi.mocked(readBody).mockResolvedValue({
			title: 'Test',
			slots,
			votePolicy: 'open',
			hideResults: true,
			password: 'sesame',
		});
		vi.mocked(createPoll).mockResolvedValue({
			id: 'poll-1',
			passwordHash: 'scrypt:x:y',
		});

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;
		const result = await handler(mockEvent);

		expect(createPoll).toHaveBeenCalledWith(
			expect.objectContaining({
				votePolicy: 'open',
				hideResults: true,
				password: 'sesame',
			}),
		);
		expect(result).toEqual({ id: 'poll-1', hasPassword: true });
	});

	it.each([
		[{ votePolicy: 'admin' }, 'Politique de vote invalide'],
		[{ hideResults: 'oui' }, 'hideResults doit être un booléen'],
		[{ password: 'ab' }, 'au moins 4 caractères'],
	])('refuse des options invalides (%o)', async (options, message) => {
		vi.mocked(readBody).mockResolvedValue({
			title: 'Test',
			slots: [
				{
					start: '2030-01-01T09:00:00.000Z',
					end: '2030-01-01T10:00:00.000Z',
				},
			],
			...options,
		});

		const handler = (await import('../../../server/api/polls/create.post'))
			.default;

		await expect(handler(mockEvent)).rejects.toThrow(message);
	});
});
