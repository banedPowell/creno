import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
	pollsTable,
	participantsTable,
	votesTable,
	slotsTable,
} from '../../../db/schema';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({
			statusCode: 400,
			message: 'Le slug est requis',
		});
	}

	const body = await readBody(event);

	if (!body.name || typeof body.name !== 'string') {
		throw createError({
			statusCode: 400,
			message: 'Le nom du participant est requis',
		});
	}

	const VALID_STATUSES = ['yes', 'maybe'] as const;
	const rawVotes: {
		slotId: string;
		status: (typeof VALID_STATUSES)[number];
	}[] = Array.isArray(body.votes) ? body.votes : [];

	for (const vote of rawVotes) {
		if (!vote.slotId || typeof vote.slotId !== 'string') {
			throw createError({
				statusCode: 400,
				message: 'Chaque vote doit contenir un slotId valide',
			});
		}

		if (
			!VALID_STATUSES.includes(
				vote.status as (typeof VALID_STATUSES)[number],
			)
		) {
			throw createError({
				statusCode: 400,
				message: `Statut invalide "${vote.status}". Valeurs acceptées : ${VALID_STATUSES.join(', ')}`,
			});
		}
	}

	const db = useDrizzle();

	const poll = await db
		.select()
		.from(pollsTable)
		.where(eq(pollsTable.slug, slug))
		.get();

	if (!poll) {
		throw createError({
			statusCode: 404,
			message: 'Sondage introuvable',
		});
	}

	if (poll.closedAt && poll.closedAt <= new Date()) {
		throw createError({
			statusCode: 410,
			message: 'Ce sondage est fermé',
		});
	}

	if (rawVotes.length > 0) {
		const validSlots = await db
			.select({ id: slotsTable.id })
			.from(slotsTable)
			.where(eq(slotsTable.pollId, poll.id))
			.all();

		const validSlotIds = new Set(validSlots.map((s) => s.id));
		const invalidSlotIds = rawVotes
			.filter((v) => !validSlotIds.has(v.slotId))
			.map((v) => v.slotId);

		if (invalidSlotIds.length > 0) {
			throw createError({
				statusCode: 400,
				message: `Créneaux invalides : ${invalidSlotIds.join(', ')}`,
			});
		}
	}

	const participantId = nanoid();

	const [participant] = await db
		.insert(participantsTable)
		.values({
			id: participantId,
			name: body.name,
			pollId: poll.id,
		})
		.returning({ id: participantsTable.id });

	const insertedVotes =
		rawVotes.length > 0
			? await db
					.insert(votesTable)
					.values(
						rawVotes.map((vote) => ({
							id: nanoid(),
							participantId,
							slotId: vote.slotId,
							status: vote.status as 'yes' | 'maybe',
						})),
					)
					.returning()
			: [];

	setResponseStatus(event, 201);
	return { ...participant, votes: insertedVotes };
});
