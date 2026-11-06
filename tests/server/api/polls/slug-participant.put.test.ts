import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockEvent } from '../../mocks';
import {
	createError,
	getHeader,
	getRouterParam,
	readBody,
	requireParticipant,
	requirePollBySlug,
	updateParticipantWithVotes,
} from '../../mocks';

const mockEvent: MockEvent = {};

const futureDate = new Date('2030-12-31T23:59:59Z');
const pastDate = new Date('2020-01-01T00:00:00Z');

const TOKEN = 'a'.repeat(32);

const handler = async () =>
	(await import('../../../../server/api/polls/[slug]/participants/[id].put'))
		.default;

const route = (params: Record<string, string | undefined>) =>
	vi
		.mocked(getRouterParam)
		.mockImplementation((_event, name: string) => params[name]);

const givenPoll = (overrides: object = {}) =>
	vi.mocked(requirePollBySlug).mockResolvedValue({
		id: 'poll-1',
		slug: 'abc',
		closedAt: futureDate,
		votePolicy: 'token',
		...overrides,
	});

const givenParticipant = (overrides: object = {}) =>
	vi.mocked(requireParticipant).mockResolvedValue({
		id: 'p1',
		name: 'Alice',
		pollId: 'poll-1',
		editToken: TOKEN,
		...overrides,
	});

const givenToken = (token: string | undefined) =>
	vi.mocked(getHeader).mockReturnValue(token);

beforeEach(() => {
	vi.clearAllMocks();
	route({ slug: 'abc', id: 'p1' });
	vi.mocked(readBody).mockResolvedValue({
		name: '  Alice B.  ',
		votes: [{ slotId: 's1', status: 'maybe' }],
	});
	givenPoll();
	givenParticipant();
	givenToken(TOKEN);
	vi.mocked(updateParticipantWithVotes).mockResolvedValue({ id: 'p1' });
});

describe('PUT /api/polls/[slug]/participants/[id]', () => {
	it('retourne 400 sans participant dans le chemin', async () => {
		route({ slug: 'abc' });
		await expect((await handler())(mockEvent)).rejects.toThrow(
			'Le slug et le participant sont requis',
		);
	});

	it('retourne 400 si la réponse est invalide', async () => {
		vi.mocked(readBody).mockResolvedValue({ name: '', votes: [] });
		await expect((await handler())(mockEvent)).rejects.toThrow(
			'Indiquez votre nom',
		);
		expect(updateParticipantWithVotes).not.toHaveBeenCalled();
	});

	it('retourne 404 pour un participant d’un autre sondage', async () => {
		vi.mocked(requireParticipant).mockRejectedValue(
			createError({
				statusCode: 404,
				message: 'Participant introuvable',
			}),
		);
		await expect((await handler())(mockEvent)).rejects.toThrow(
			'Participant introuvable',
		);
		expect(requireParticipant).toHaveBeenCalledWith('poll-1', 'p1');
	});

	it('retourne 410 si le sondage est fermé', async () => {
		givenPoll({ closedAt: pastDate });
		await expect((await handler())(mockEvent)).rejects.toMatchObject({
			statusCode: 410,
		});
	});

	describe('politique token', () => {
		it('refuse sans token', async () => {
			givenToken(undefined);
			await expect((await handler())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
				message: 'Vous ne pouvez modifier que votre propre réponse',
			});
		});

		it('refuse un mauvais token', async () => {
			givenToken('b'.repeat(32));
			await expect((await handler())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
			});
		});

		it('refuse un token de longueur différente', async () => {
			givenToken('short');
			await expect((await handler())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
			});
		});

		it('refuse un participant qui n’a pas de token', async () => {
			givenParticipant({ editToken: null });
			await expect((await handler())(mockEvent)).rejects.toMatchObject({
				statusCode: 403,
			});
		});

		it('remplace la réponse avec le bon token', async () => {
			const result = await (await handler())(mockEvent);

			expect(getHeader).toHaveBeenCalledWith(mockEvent, 'x-creno-token');
			expect(updateParticipantWithVotes).toHaveBeenCalledWith(
				'poll-1',
				'p1',
				'Alice B.',
				[{ slotId: 's1', status: 'maybe' }],
			);
			expect(result).toEqual({ id: 'p1' });
		});
	});

	describe('politique open', () => {
		it('laisse modifier sans token', async () => {
			givenPoll({ votePolicy: 'open' });
			givenToken(undefined);
			givenParticipant({ editToken: null });

			await (
				await handler()
			)(mockEvent);

			expect(updateParticipantWithVotes).toHaveBeenCalledOnce();
		});
	});
});
