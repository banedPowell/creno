import type { CalendarTimeSlot, VoteStatus } from '~/types/calendar';

const STATUS_LABELS: Record<VoteStatus | 'none', string> = {
	none: 'absent',
	yes: 'présent',
	maybe: 'peut-être',
};

const NEXT_STATUS: Record<VoteStatus | 'none', VoteStatus | 'none'> = {
	none: 'yes',
	yes: 'maybe',
	maybe: 'none',
};

// Everything a slot shows while a poll is being answered: the visitor's own
// choice, who else answered and how, and whether it leads
export const useSlotVote = (slot: MaybeRefOrGetter<CalendarTimeSlot>) => {
	const { vote, now } = useCalendarContext();
	if (!vote) throw new Error('useSlotVote needs a calendar in vote mode');

	const id = computed(() => toValue(slot).id);

	const status = computed<VoteStatus | 'none'>(
		() => vote.votes.value[id.value] ?? 'none',
	);
	const voters = computed(() => vote.voters.value[id.value] ?? []);
	const yes = computed(() => voters.value.filter((v) => v.status === 'yes'));
	const maybe = computed(() =>
		voters.value.filter((v) => v.status === 'maybe'),
	);
	const isBest = computed(() => vote.bestSlotIds.value.includes(id.value));
	const isPast = computed(() => isSlotPast(toValue(slot), now.value));
	const isChosen = computed(() => vote.chosenSlotId?.value === id.value);
	const isSelected = computed(
		() => vote.picking?.selectedId.value === id.value,
	);
	// Picking works on any slot, even a past one: the meeting may be over
	const disabled = computed(() =>
		vote.picking ? false : vote.readonly.value || isPast.value,
	);

	// A participant picked in the list: the slots they left out step back
	const isDimmed = computed(() => {
		const focused = vote.focusedParticipantId.value;
		return Boolean(focused) && !voters.value.some((v) => v.id === focused);
	});

	const tooltip = computed(() => {
		const lines = [
			yes.value.length &&
				`Présents : ${yes.value.map((v) => v.name).join(', ')}`,
			maybe.value.length &&
				`Peut-être : ${maybe.value.map((v) => v.name).join(', ')}`,
		].filter(Boolean);
		return lines.length
			? lines.join('\n')
			: 'Aucune réponse pour l’instant';
	});

	const describe = (label: string) => {
		const parts = [`Créneau ${label}`];
		if (!vote.readonly.value && !vote.picking)
			parts.push(STATUS_LABELS[status.value]);
		if (isChosen.value) parts.push('retenu');
		if (isBest.value) parts.push('le plus demandé');
		parts.push(
			`${yes.value.length} présent${yes.value.length > 1 ? 's' : ''}`,
		);
		parts.push(`${maybe.value.length} peut-être`);
		if (isPast.value) parts.push('déjà passé');
		if (vote.picking)
			parts.push(
				isSelected.value ? 'sélectionné' : 'cliquer pour sélectionner',
			);
		else if (!disabled.value)
			parts.push(
				`cliquer pour ${STATUS_LABELS[NEXT_STATUS[status.value]]}`,
			);
		return parts.join(', ');
	};

	const toggle = () => {
		if (vote.picking) vote.picking.select(id.value);
		else if (!disabled.value) vote.cycleVote(id.value);
	};

	return {
		status,
		yes,
		maybe,
		isBest,
		isChosen,
		isSelected,
		isPast,
		isDimmed,
		disabled,
		tooltip,
		describe,
		toggle,
	};
};
