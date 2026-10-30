import { describe, it, expect, vi } from 'vitest';
import type { MockEvent } from '../../mocks';
import {
	getRouterParam,
	requirePollBySlug,
	getPollWithSlots,
	getHeader,
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
		expect(result).toEqual({
			...mockPoll,
			hasPassword: false,
			slots: mockSlots,
		});
	});

	it('demande le mot de protection quand le sondage en a un', async () => {
		const { hashPassword } =
			await import('../../../../server/utils/password');
		vi.mocked(getRouterParam).mockReturnValue('abc123');
		vi.mocked(requirePollBySlug).mockResolvedValue({
			id: 'poll-1',
			adminToken: 'admin-token',
			passwordHash: hashPassword('sesame'),
		});
		vi.mocked(getPollWithSlots).mockResolvedValue([]);
		const handler = (
			await import('../../../../server/api/polls/[slug].get')
		).default;

		vi.mocked(getHeader).mockReturnValue(undefined);
		await expect(handler(mockEvent)).rejects.toMatchObject({
			statusCode: 401,
			message: 'Mot de passe requis',
		});

		vi.mocked(getHeader).mockImplementation((_event, name) =>
			name === 'x-creno-password' ? 'faux' : undefined,
		);
		await expect(handler(mockEvent)).rejects.toThrow(
			'Mot de passe incorrect',
		);

		vi.mocked(getHeader).mockImplementation((_event, name) =>
			name === 'x-creno-password'
				? encodeURIComponent('sesame')
				: undefined,
		);
		const result = await handler(mockEvent);
		expect(result).toMatchObject({ hasPassword: true });
		expect(result).not.toHaveProperty('passwordHash');

		vi.mocked(getHeader).mockImplementation((_event, name) =>
			name === 'x-creno-admin' ? 'admin-token' : undefined,
		);
		await expect(handler(mockEvent)).resolves.toMatchObject({
			id: 'poll-1',
		});
		vi.mocked(getHeader).mockReset();
	});

	it("n'expose pas le token admin", async () => {
		const mockPoll = {
			id: 'poll-1',
			title: 'Test',
			slug: 'abc123',
			adminToken: 'secret-admin-token',
		};

		vi.mocked(getRouterParam).mockReturnValue('abc123');
		vi.mocked(requirePollBySlug).mockResolvedValue(mockPoll);
		vi.mocked(getPollWithSlots).mockResolvedValue([]);

		const handler = (
			await import('../../../../server/api/polls/[slug].get')
		).default;
		const result = await handler(mockEvent);

		expect(result).not.toHaveProperty('adminToken');
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
