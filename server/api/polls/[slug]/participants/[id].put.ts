import {
	EDIT_TOKEN_HEADER,
	votePayloadSchema,
} from '../../../../../shared/utils/votePayload';
import { isSameToken } from '../../../../utils/token';

export default defineEventHandler(async (event) => {
	const slug = getRouterParam(event, 'slug');
	const participantId = getRouterParam(event, 'id');

	if (!slug || !participantId) {
		throw createError({
			statusCode: 400,
			message: 'Le slug et le participant sont requis',
		});
	}

	const parsed = votePayloadSchema.safeParse((await readBody(event)) ?? {});

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]!.message,
		});
	}

	const poll = await requirePollBySlug(slug);
	const participant = await requireParticipant(poll.id, participantId);

	if (poll.closedAt && poll.closedAt <= new Date()) {
		throw createError({
			statusCode: 410,
			message: 'Ce sondage est fermé',
		});
	}

	if (poll.votePolicy !== 'open') {
		const token = getHeader(event, EDIT_TOKEN_HEADER);
		if (
			!token ||
			!participant.editToken ||
			!isSameToken(token, participant.editToken)
		) {
			throw createError({
				statusCode: 403,
				message: 'Vous ne pouvez modifier que votre propre réponse',
			});
		}
	}

	return updateParticipantWithVotes(
		poll.id,
		participant.id,
		parsed.data.name,
		parsed.data.votes,
	);
});
