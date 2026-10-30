import { z } from 'zod';

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const MAX_SLOTS = 100;
export const MIN_SLOT_DURATION_MINUTES = 15;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 100;

export const ADMIN_TOKEN_HEADER = 'x-creno-admin';
// Sent URI-encoded: a header only carries Latin-1
export const PASSWORD_HEADER = 'x-creno-password';

export const POLL_VOTE_POLICIES = ['token', 'open'] as const;
export type PollVotePolicy = (typeof POLL_VOTE_POLICIES)[number];

export const pollTitleSchema = z
	.string({ error: 'Ajoutez un titre (2 caractères minimum)' })
	.trim()
	.min(2, 'Ajoutez un titre (2 caractères minimum)')
	.max(
		TITLE_MAX_LENGTH,
		`Le titre ne doit pas dépasser ${TITLE_MAX_LENGTH} caractères`,
	);

export const pollDescriptionSchema = z
	.string()
	.trim()
	.max(
		DESCRIPTION_MAX_LENGTH,
		`La description ne doit pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères`,
	);

export const pollPasswordSchema = z
	.string({ error: 'Mot de protection invalide' })
	.min(
		PASSWORD_MIN_LENGTH,
		`Le mot de protection doit faire au moins ${PASSWORD_MIN_LENGTH} caractères`,
	)
	.max(
		PASSWORD_MAX_LENGTH,
		`Le mot de protection ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères`,
	);

export const votePolicySchema = z.enum(POLL_VOTE_POLICIES, {
	error: 'Politique de vote invalide. Valeurs acceptées : token, open',
});

// The settings tucked away under "Options avancées", the same at creation and
// in the admin
export interface PollOptions {
	votePolicy: PollVotePolicy;
	hideResults: boolean;
	// Empty for none
	password: string;
}

export const DEFAULT_POLL_OPTIONS: PollOptions = {
	votePolicy: 'token',
	hideResults: false,
	password: '',
};

// Everything the admin may change, each field left out stays as it is
export const pollSettingsSchema = z.object({
	title: pollTitleSchema.optional(),
	description: pollDescriptionSchema
		.nullable()
		.optional()
		.transform((value) =>
			value === undefined ? undefined : value || null,
		),
	// 'now' closes on the server's clock, not the browser's
	closedAt: z
		.union(
			[
				z.iso.datetime({
					offset: true,
					error: 'Date de clôture invalide',
				}),
				z.literal('now'),
			],
			{ error: 'Date de clôture invalide' },
		)
		.optional(),
	votePolicy: votePolicySchema.optional(),
	hideResults: z
		.boolean({ error: 'hideResults doit être un booléen' })
		.optional(),
	// null takes the protection off
	password: pollPasswordSchema.nullable().optional(),
	chosenSlotId: z
		.string({ error: 'Créneau retenu invalide' })
		.min(1, 'Créneau retenu invalide')
		.nullable()
		.optional(),
});

export type PollSettings = z.output<typeof pollSettingsSchema>;
export type PollSettingsInput = z.input<typeof pollSettingsSchema>;

export const slotsUpdateSchema = z.object({
	slots: z
		.array(
			z.object({
				// Left out for a new slot, kept to carry its votes over
				id: z.string().min(1).optional(),
				start: z.iso.datetime({ error: 'Début de créneau invalide' }),
				end: z.iso.datetime({ error: 'Fin de créneau invalide' }),
			}),
			{ error: 'Les créneaux sont requis' },
		)
		.min(1, 'Gardez au moins un créneau')
		.max(MAX_SLOTS, `${MAX_SLOTS} créneaux maximum`)
		.refine(
			(slots) =>
				slots.every(
					({ start, end }) =>
						Date.parse(end) - Date.parse(start) >=
						MIN_SLOT_DURATION_MINUTES * 60_000,
				),
			`Un créneau doit durer au moins ${MIN_SLOT_DURATION_MINUTES} minutes`,
		),
	// Only counts the votes the change would drop, nothing is written
	dryRun: z.boolean().optional(),
});

export type SlotsUpdate = z.output<typeof slotsUpdateSchema>;
