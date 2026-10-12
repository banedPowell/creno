import type { FormError } from '@nuxt/ui';
import type { InternalApi } from 'nitropack/types';
import type { CalendarVoteState, VoteStatus } from '~/types/calendar';
import type { OwnVote } from '~/composables/useOwnVotes';
import { EDIT_TOKEN_HEADER } from '#shared/utils/votePayload';

type PollResults = InternalApi['/api/polls/:slug/results']['get'];

// The visitor's answer: password, form, revision, and the request that sends it.
// The page loads the poll first: hooks after an await inside here lose the page.
export const usePollAnswer = (
	slug: ComputedRef<string>,
	poll: Ref<PollResults | null | undefined>,
	error: Ref<{ statusCode?: number } | null | undefined>,
	refresh: () => Promise<void>,
	credentials: ComputedRef<Record<string, string>>,
	ownEntry: Ref<OwnVote | null>,
	password: Ref<string>,
) => {
	const toast = useToast();
	const { save, get, forget } = useOwnVotes();

	const wrongPassword = shallowRef(false);
	const unlocking = shallowRef(false);
	const closedByServer = shallowRef(false);

	const isNotFound = computed(() => error.value?.statusCode === 404);
	const needsPassword = computed(() => error.value?.statusCode === 401);

	const unlock = async (value: string) => {
		unlocking.value = true;
		password.value = value;
		await refresh();
		wrongPassword.value = needsPassword.value;
		unlocking.value = false;
	};

	const now = useNow({ interval: 60_000 });
	const isClosed = computed(
		() =>
			closedByServer.value ||
			(!!poll.value &&
				new Date(poll.value.closedAt).getTime() <= Date.now()),
	);
	const isOpenPolicy = computed(() => poll.value?.votePolicy === 'open');

	const calendarSlots = computed(
		() => poll.value?.slots.map(apiSlotToCalendarSlot) ?? [],
	);

	const firstDay = computed(() => {
		const days = calendarSlots.value.map((slot) => slot.startDate).sort();
		const today = isoDate(now.value);
		return {
			first: days[0] ? parseIsoDate(days[0]) : undefined,
			upcoming: days.find((day) => day >= today) ?? days.at(-1),
		};
	});

	const state = reactive({ name: '' });
	const votes = ref<Record<string, VoteStatus>>({});
	const focusedParticipantId = ref<string | null>(null);
	const editingId = ref<string | null>(null);
	const revising = ref(false);

	const isEditingOwn = computed(
		() =>
			!!editingId.value &&
			editingId.value === ownEntry.value?.participantId,
	);

	const participantName = (id: string) =>
		poll.value?.participants.find((p) => p.id === id)?.name ?? '';

	const resetForm = () => {
		editingId.value = null;
		revising.value = false;
		state.name = '';
		votes.value = {};
	};

	const loadAnswer = (participantId: string) => {
		if (!poll.value?.participants.some((p) => p.id === participantId))
			return;
		state.name = participantName(participantId);
		votes.value = Object.fromEntries(
			poll.value.slots.flatMap((slot) =>
				slot.voters
					.filter((voter) => voter.id === participantId)
					.map((voter) => [slot.id, voter.status]),
			),
		);
		editingId.value = participantId;
	};

	const forgetOwn = () => {
		forget(slug.value);
		ownEntry.value = null;
	};

	onMounted(async () => {
		const entry = get(slug.value);
		ownEntry.value = entry ?? null;
		if (Object.keys(credentials.value).length) await refresh();
		if (!entry || !poll.value) return;
		if (!poll.value.participants.some((p) => p.id === entry.participantId))
			return forgetOwn();
		if (!isClosed.value) loadAnswer(entry.participantId);
	});

	const cycleVote = (slotId: string) => {
		const { [slotId]: current, ...rest } = votes.value;
		votes.value =
			current === undefined
				? { ...rest, [slotId]: 'yes' }
				: current === 'yes'
					? { ...rest, [slotId]: 'maybe' }
					: rest;
	};

	const EMPTY_VOTES: Record<string, VoteStatus> = {};
	const answering = computed(() => !editingId.value || revising.value);

	const voteState: CalendarVoteState = {
		votes: computed(() => (answering.value ? votes.value : EMPTY_VOTES)),
		voters: computed(() =>
			Object.fromEntries(
				(poll.value?.slots ?? []).map((slot) => [
					slot.id,
					revising.value
						? slot.voters.filter(
								(voter) => voter.id !== editingId.value,
							)
						: slot.voters,
				]),
			),
		),
		bestSlotIds: computed(() => bestSlotIds(poll.value?.slots ?? [])),
		readonly: computed(
			() => isClosed.value || (!!editingId.value && !revising.value),
		),
		focusedParticipantId,
		cycleVote,
		chosenSlotId: computed(() => poll.value?.chosenSlotId ?? null),
	};

	const chosenSlot = computed(() =>
		calendarSlots.value.find(
			(slot) => slot.id === poll.value?.chosenSlotId,
		),
	);

	const editing = computed(() =>
		editingId.value
			? {
					name: participantName(editingId.value),
					own: isEditingOwn.value,
				}
			: null,
	);

	const locked = computed(
		() => !!editingId.value && !revising.value && !isClosed.value,
	);

	const result = computed(() =>
		buildVotePayload({ name: state.name, votes: votes.value }),
	);
	const isValid = computed(() => result.value.success);
	const validate = (): FormError[] =>
		result.value.success
			? []
			: result.value.issues.map(({ path, message }) => ({
					name: path,
					message,
				}));

	const summary = computed(() => {
		if (!result.value.success) return result.value.issues[0]!.message;
		const answers = Object.values(votes.value);
		const yes = answers.filter((status) => status === 'yes').length;
		const maybe = answers.length - yes;
		if (!answers.length) return 'Absent sur tous les créneaux';
		return [
			yes && `${yes} présence${yes > 1 ? 's' : ''}`,
			maybe && `${maybe} peut-être`,
		]
			.filter(Boolean)
			.join(' · ');
	});

	const calendar = useTemplateRef<{
		bestSlots: { length: number };
		bestIndex: number;
		revealNextBest: () => void;
	}>('calendar');
	const best = useBestSlot(calendar);
	const pending = shallowRef(false);

	const sendNew = async (body: VotePayload) => {
		const created = await $fetch<{ id: string; editToken?: string | null }>(
			`/api/polls/${slug.value}/vote`,
			{ method: 'POST', body, headers: credentials.value },
		);
		if (created.editToken) {
			ownEntry.value = {
				participantId: created.id,
				editToken: created.editToken,
			};
			save(slug.value, ownEntry.value);
		}
		toast.add({
			title: 'Merci, votre réponse est enregistrée',
			description: 'Vous pourrez la modifier depuis ce navigateur.',
			color: 'success',
		});
		await refresh();
		loadAnswer(created.id);
		revising.value = false;
	};

	const sendChange = async (participantId: string, body: VotePayload) => {
		const own = isEditingOwn.value;
		await $fetch(`/api/polls/${slug.value}/participants/${participantId}`, {
			method: 'PUT',
			body,
			headers: {
				...credentials.value,
				...(own
					? { [EDIT_TOKEN_HEADER]: ownEntry.value!.editToken }
					: {}),
			},
		});
		toast.add({
			title: own
				? 'Votre réponse est modifiée'
				: `Réponse de ${participantName(participantId)} modifiée`,
			color: 'success',
		});
		await refresh();
		if (own) {
			loadAnswer(participantId);
			revising.value = false;
		} else resetForm();
	};

	const onSubmit = async () => {
		if (!result.value.success || pending.value) return;
		if (editingId.value && !revising.value) return;
		pending.value = true;
		try {
			if (editingId.value)
				await sendChange(editingId.value, result.value.data);
			else await sendNew(result.value.data);
		} catch (failure) {
			const { statusCode, data } = failure as {
				statusCode?: number;
				data?: { message?: string };
			};
			if (statusCode === 410) {
				closedByServer.value = true;
				toast.add({
					title: 'Ce Creno vient de fermer',
					description: 'Votre réponse n’a pas pu être enregistrée.',
					color: 'warning',
				});
				await refresh();
			} else if (
				editingId.value &&
				(statusCode === 403 || statusCode === 404)
			) {
				if (isEditingOwn.value) forgetOwn();
				resetForm();
				toast.add({
					title:
						statusCode === 403
							? 'Vous ne pouvez modifier que votre propre réponse'
							: 'Cette réponse n’existe plus',
					color: 'error',
				});
				await refresh();
			} else {
				toast.add({
					title: 'Erreur',
					description: data?.message ?? 'Une erreur est survenue.',
					color: 'error',
				});
			}
		} finally {
			pending.value = false;
		}
	};

	const startRevision = () => {
		revising.value = true;
	};

	const cancelRevision = () => {
		if (isEditingOwn.value && editingId.value) {
			loadAnswer(editingId.value);
			revising.value = false;
			return;
		}
		resetForm();
	};

	const onEditParticipant = (id: string) => {
		loadAnswer(id);
		revising.value = true;
		focusedParticipantId.value = null;
	};

	return {
		poll,
		error,
		refresh,
		isNotFound,
		needsPassword,
		credentials,
		ownEntry,
		wrongPassword,
		unlocking,
		unlock,
		isClosed,
		isOpenPolicy,
		calendarSlots,
		firstDay,
		state,
		focusedParticipantId,
		editingId,
		revising,
		voteState,
		chosenSlot,
		editing,
		locked,
		isValid,
		validate,
		summary,
		pending,
		onSubmit,
		startRevision,
		cancelRevision,
		onEditParticipant,
		...best,
	};
};
