import { z } from 'zod';

export const NAME_MAX_LENGTH = 60;
export const MAX_VOTES = 100;
export const VOTE_STATUSES = ['yes', 'maybe'] as const;

export type VoteStatus = (typeof VOTE_STATUSES)[number];

// Carries the token that proves an answer is one's own
export const EDIT_TOKEN_HEADER = 'x-creno-token';

const NAME_REQUIRED = 'Indiquez votre nom';
const INVALID_SLOT = 'Chaque vote doit contenir un slotId valide';

export const votePayloadSchema = z.object({
	name: z
		.string({ error: NAME_REQUIRED })
		.trim()
		.min(1, NAME_REQUIRED)
		.max(
			NAME_MAX_LENGTH,
			`Le nom ne doit pas dépasser ${NAME_MAX_LENGTH} caractères`,
		),
	votes: z
		.array(
			z.object({
				slotId: z.string({ error: INVALID_SLOT }).min(1, INVALID_SLOT),
				status: z.enum(VOTE_STATUSES, {
					error: `Statut invalide. Valeurs acceptées : ${VOTE_STATUSES.join(', ')}`,
				}),
			}),
			{ error: 'Les votes doivent être une liste' },
		)
		.max(MAX_VOTES, `${MAX_VOTES} votes maximum`)
		.refine(
			(votes) =>
				new Set(votes.map((vote) => vote.slotId)).size === votes.length,
			'Un créneau ne peut recevoir qu’un seul vote',
		)
		.default([]),
});

export type VotePayload = z.output<typeof votePayloadSchema>;

export type VotePayloadField = 'name' | 'votes';

export interface VotePayloadIssue {
	path: VotePayloadField;
	message: string;
}

export type VotePayloadResult =
	| { success: true; data: VotePayload }
	| { success: false; issues: VotePayloadIssue[] };

export interface VotePayloadInput {
	name?: string;
	// An absent slot is simply left out
	votes: Record<string, VoteStatus>;
}

export const buildVotePayload = (
	input: VotePayloadInput,
): VotePayloadResult => {
	const parsed = votePayloadSchema.safeParse({
		name: input.name ?? '',
		votes: Object.entries(input.votes).map(([slotId, status]) => ({
			slotId,
			status,
		})),
	});

	if (parsed.success) return { success: true, data: parsed.data };

	return {
		success: false,
		issues: parsed.error.issues
			.map((issue) => ({
				path: issue.path[0] as VotePayloadField,
				message: issue.message,
			}))
			.sort((a, b) =>
				a.path === b.path ? 0 : a.path === 'name' ? -1 : 1,
			),
	};
};
