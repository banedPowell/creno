import { useWebHaptics } from 'web-haptics/vue';
import { CalendarDate } from '@internationalized/date';
import type { InternalApi } from 'nitropack/types';
import type {
	CalendarTimeSlot,
	CalendarVoteState,
	VoteStatus,
} from '~/types/calendar';
import {
	DEFAULT_POLL_OPTIONS,
	pollDescriptionSchema,
	pollPasswordSchema,
	pollTitleSchema,
	type PollOptions,
	type PollSettingsInput,
} from '#shared/utils/pollSettings';

type AdminPoll = InternalApi['/api/polls/:slug/admin']['get'];

const toCalendarDate = (value: string | Date) => {
	const date = new Date(value);
	return new CalendarDate(
		date.getFullYear(),
		date.getMonth() + 1,
		date.getDate(),
	);
};

const slotKey = (slots: CalendarTimeSlot[]) =>
	JSON.stringify(
		slots
			.map((slot) => [
				slot.id,
				slot.startDate,
				slot.endDate,
				slot.startTime,
				slot.endTime,
			])
			.sort(),
	);

// The organiser's draft: details, slots, the slot to keep, and one save
export const usePollAdminEditor = (
	poll: Ref<AdminPoll | null | undefined>,
	slug: ComputedRef<string>,
	headers: ComputedRef<Record<string, string> | undefined>,
	refresh: () => Promise<void>,
) => {
	const haptic = useWebHaptics();
	const toast = useToast();
	const { removePoll } = useOwnedPolls();
	const now = useNow({ interval: 60_000 });

	const title = ref('');
	const description = ref('');
	const closingDate = shallowRef(new CalendarDate(2026, 1, 1));
	const options = ref<PollOptions>({ ...DEFAULT_POLL_OPTIONS });
	const snapMinutes = ref(30);
	const clickSlotDuration = ref(120);
	const selectedId = ref<string | null>(null);
	const dropPassword = ref(false);
	const draft = ref<CalendarTimeSlot[]>([]);
	const intent = ref<null | 'close' | 'unchoose'>(null);
	const focusedParticipantId = ref<string | null>(null);
	const pending = shallowRef<
		null | 'settings' | 'status' | 'choose' | 'slots' | 'delete'
	>(null);

	const savedSlots = computed(
		() => poll.value?.slots.map(apiSlotToCalendarSlot) ?? [],
	);

	const isClosed = computed(
		() =>
			intent.value === 'close' ||
			(!!poll.value &&
				new Date(poll.value.closedAt).getTime() <= Date.now()),
	);

	const today = new Date();
	const minDate = new CalendarDate(
		today.getFullYear(),
		today.getMonth() + 1,
		today.getDate(),
	);

	const resetDraft = () => {
		if (!poll.value) return;
		title.value = poll.value.title;
		description.value = poll.value.description ?? '';
		closingDate.value = toCalendarDate(poll.value.closedAt);
		options.value = {
			votePolicy: poll.value.votePolicy,
			hideResults: poll.value.hideResults,
			password: '',
		};
		dropPassword.value = false;
		draft.value = savedSlots.value.map((slot) => ({ ...slot }));
		intent.value = null;
		selectedId.value = null;
	};
	watch(poll, resetDraft);

	const firstDay = computed(() => {
		const days = draft.value.map((slot) => slot.startDate).sort();
		const todayStr = isoDate(now.value);
		return {
			first: days[0] ? parseIsoDate(days[0]) : undefined,
			upcoming: days.find((day) => day >= todayStr) ?? days.at(-1),
		};
	});

	const chosenSlot = computed(() =>
		draft.value.find((slot) => slot.id === poll.value?.chosenSlotId),
	);

	const NO_VOTES: Record<string, VoteStatus> = {};
	const voteState: CalendarVoteState = {
		votes: computed(() => NO_VOTES),
		voters: computed(() =>
			Object.fromEntries(
				(poll.value?.slots ?? []).map((slot) => [slot.id, slot.voters]),
			),
		),
		bestSlotIds: computed(() => bestSlotIds(poll.value?.slots ?? [])),
		readonly: computed(() => true),
		focusedParticipantId,
		cycleVote: () => {},
		chosenSlotId: computed(() => poll.value?.chosenSlotId ?? null),
		picking: {
			selectedId,
			select: (id) => {
				haptic.trigger('light');
				selectedId.value = selectedId.value === id ? null : id;
				if (selectedId.value) intent.value = null;
			},
		},
	};

	const selectedSlot = computed(() =>
		draft.value.find((slot) => slot.id === selectedId.value),
	);
	const slotsDirty = computed(
		() => slotKey(draft.value) !== slotKey(savedSlots.value),
	);

	const settings = computed<PollSettingsInput>(() => {
		if (!poll.value) return {};
		const result: PollSettingsInput = {};
		const nextTitle = title.value.trim();
		const nextDescription = description.value.trim();
		if (nextTitle !== poll.value.title) result.title = nextTitle;
		if (nextDescription !== (poll.value.description ?? ''))
			result.description = nextDescription || null;
		if (
			intent.value !== 'close' &&
			closingDate.value.compare(toCalendarDate(poll.value.closedAt)) !== 0
		)
			result.closedAt = closingDateToDate(
				closingDate.value,
			).toISOString();
		if (options.value.votePolicy !== poll.value.votePolicy)
			result.votePolicy = options.value.votePolicy;
		if (options.value.hideResults !== poll.value.hideResults)
			result.hideResults = options.value.hideResults;
		if (options.value.password) result.password = options.value.password;
		else if (dropPassword.value) result.password = null;
		if (intent.value === 'close') result.closedAt = 'now';
		if (intent.value === 'unchoose') result.chosenSlotId = null;
		if (selectedId.value) result.chosenSlotId = selectedId.value;
		return result;
	});

	const issue = computed(() => {
		const checks = [
			pollTitleSchema.safeParse(title.value),
			pollDescriptionSchema.safeParse(description.value),
			options.value.password
				? pollPasswordSchema.safeParse(options.value.password)
				: { success: true as const },
		];
		for (const check of checks)
			if (!check.success) return check.error.issues[0]!.message;
		return undefined;
	});

	const dirty = computed(
		() => Object.keys(settings.value).length > 0 || slotsDirty.value,
	);

	const summary = computed(() => {
		if (issue.value) return issue.value;
		const parts: string[] = [];
		if (selectedSlot.value)
			parts.push(`Retenir ${formatSlotLabel(selectedSlot.value)}`);
		else if (intent.value === 'unchoose')
			parts.push('Annuler le créneau retenu');
		if (intent.value === 'close') parts.push('Clôturer maintenant');
		else if (settings.value.closedAt)
			parts.push('Nouvelle date de clôture');
		if (slotsDirty.value) parts.push('Créneaux modifiés');
		if (
			settings.value.title ||
			settings.value.description !== undefined ||
			settings.value.votePolicy ||
			settings.value.hideResults !== undefined ||
			settings.value.password !== undefined
		)
			parts.push('Détails modifiés');
		return parts.join(' · ') || 'Aucune modification';
	});

	const arm = (next: 'close' | 'unchoose') => {
		haptic.trigger('medium');
		intent.value = intent.value === next ? null : next;
		if (next === 'unchoose') selectedId.value = null;
	};

	const reopen = () => {
		haptic.trigger('medium');
		intent.value = intent.value === 'close' ? null : intent.value;
		const date = new Date();
		date.setDate(date.getDate() + 7);
		closingDate.value = new CalendarDate(
			date.getFullYear(),
			date.getMonth() + 1,
			date.getDate(),
		);
	};

	const calendar = useTemplateRef<{
		bestSlots: { length: number };
		bestIndex: number;
		revealNextBest: () => void;
	}>('calendar');
	const best = useBestSlot(calendar);

	const validateFields = () => {
		const errors: { name: string; message: string }[] = [];
		const titleCheck = pollTitleSchema.safeParse(title.value);
		if (!titleCheck.success)
			errors.push({
				name: 'title',
				message: titleCheck.error.issues[0]!.message,
			});
		const descriptionCheck = pollDescriptionSchema.safeParse(
			description.value,
		);
		if (!descriptionCheck.success)
			errors.push({
				name: 'description',
				message: descriptionCheck.error.issues[0]!.message,
			});
		return errors;
	};

	const failed = (failure: unknown) => {
		const { data } = failure as { data?: { message?: string } };
		toast.add({
			title: 'Erreur',
			description: data?.message ?? 'Une erreur est survenue.',
			color: 'error',
		});
	};

	const heldSettings = shallowRef<PollSettingsInput | null>(null);
	const applySettings = async () => {
		const body = heldSettings.value;
		heldSettings.value = null;
		if (!body || Object.keys(body).length === 0) return;
		await $fetch(`/api/polls/${slug.value}`, {
			method: 'PATCH',
			body,
			headers: headers.value,
		});
	};

	const pendingSlots = shallowRef<CalendarTimeSlot[] | null>(null);
	const lostVotes = shallowRef(0);
	const confirmOpen = computed({
		get: () => pendingSlots.value !== null,
		set: (open) => {
			if (!open) pendingSlots.value = null;
		},
	});

	const slotsBody = (slots: CalendarTimeSlot[], dryRun: boolean) => {
		const known = new Set(poll.value?.slots.map((slot) => slot.id));
		return {
			dryRun,
			slots: slots.map((slot) => ({
				...(known.has(slot.id) ? { id: slot.id } : {}),
				...calendarSlotToApiSlot(slot),
			})),
		};
	};

	const putSlots = (slots: CalendarTimeSlot[], dryRun: boolean) =>
		$fetch<{ lostVotes: number }>(`/api/polls/${slug.value}/slots`, {
			method: 'PUT',
			body: slotsBody(slots, dryRun),
			headers: headers.value,
		});

	const applySlots = async (slots: CalendarTimeSlot[]) => {
		pending.value = 'slots';
		try {
			await putSlots(slots, false);
			pendingSlots.value = null;
			await applySettings();
			toast.add({
				title: 'Modifications enregistrées',
				color: 'success',
			});
			await refresh();
		} catch (failure) {
			failed(failure);
		} finally {
			pending.value = null;
		}
	};

	const saveSlots = async (slots: CalendarTimeSlot[]) => {
		pending.value = 'slots';
		try {
			const check = await putSlots(slots, true);
			if (check.lostVotes > 0) {
				lostVotes.value = check.lostVotes;
				pendingSlots.value = slots;
				pending.value = null;
				return;
			}
		} catch (failure) {
			pending.value = null;
			return failed(failure);
		}
		await applySlots(slots);
	};

	const save = async () => {
		if (!dirty.value || issue.value || pending.value) return;
		haptic.trigger('medium');
		heldSettings.value = { ...settings.value };
		if (slotsDirty.value) await saveSlots(draft.value);
		else {
			pending.value = 'settings';
			try {
				await applySettings();
				toast.add({
					title: 'Modifications enregistrées',
					color: 'success',
				});
				await refresh();
			} catch (failure) {
				failed(failure);
			} finally {
				pending.value = null;
			}
		}
	};

	const deleteCreno = async () => {
		pending.value = 'delete';
		try {
			await $fetch(`/api/polls/${slug.value}`, {
				method: 'DELETE',
				headers: headers.value,
			});
			removePoll(slug.value);
			toast.add({ title: 'Creno supprimé', color: 'success' });
			await navigateTo('/');
		} catch (failure) {
			failed(failure);
		} finally {
			pending.value = null;
		}
	};

	return {
		title,
		description,
		closingDate,
		options,
		snapMinutes,
		clickSlotDuration,
		dropPassword,
		draft,
		intent,
		focusedParticipantId,
		pending,
		isClosed,
		minDate,
		firstDay,
		chosenSlot,
		voteState,
		dirty,
		issue,
		summary,
		lostVotes,
		confirmOpen,
		pendingSlots,
		calendar,
		...best,
		validateFields,
		resetDraft,
		arm,
		reopen,
		applySlots,
		save,
		deleteCreno,
	};
};
