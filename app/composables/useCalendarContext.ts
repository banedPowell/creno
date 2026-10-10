import type {
	CalendarConfig,
	CalendarTimeSlot,
	CalendarView,
	CalendarViewOptions,
	CalendarVoteState,
} from '~/types/calendar';
import { createInjectionState } from '@vueuse/core';

// How long a revealed slot stays highlighted
const REVEAL_DURATION = 1500;

const [useProvideCalendarContext, useInjectCalendarContext] =
	createInjectionState(
		(
			slots: Ref<CalendarTimeSlot[]>,
			config: CalendarConfig,
			defaultView: CalendarView,
			options: CalendarViewOptions & { vote?: CalendarVoteState } = {},
		) => {
			// Coarse on purpose, the past only has to grow by the minute
			const now = useNow({ interval: 60_000 });
			const calendar = useCalendarView(defaultView, options);
			const slotActions = useCalendarSlots(slots);
			const draft = useSlotDraft(config, slotActions.addSlot, now);
			// Voting answers the slots that exist, nothing new can be drawn
			const vote = options.vote ?? null;

			const highlightedSlotId = shallowRef<string | null>(null);
			const { start: clearLater, stop: keepHighlight } = useTimeoutFn(
				() => (highlightedSlotId.value = null),
				REVEAL_DURATION,
				{ immediate: false },
			);

			// Brings a slot on screen: its period, a view that shows its hours,
			// then a short pulse the slot scrolls itself to
			const revealSlot = (id: string) => {
				const slot = slots.value.find((item) => item.id === id);
				if (!slot) return;
				if (!slot.allDay && calendar.view.value === 'month')
					calendar.view.value = calendar.isDesktop.value
						? 'week'
						: 'day';
				calendar.goToDate(parseIsoDate(slot.startDate));
				keepHighlight();
				// Cleared first, so the same slot revealed twice pulses again
				highlightedSlotId.value = null;
				nextTick(() => {
					highlightedSlotId.value = id;
					clearLater();
				});
			};

			// The leading slots in time order, the header steps through them
			const bestSlots = computed(() => {
				const ids = vote?.bestSlotIds.value ?? [];
				return slots.value
					.filter((slot) => ids.includes(slot.id))
					.sort(
						(a, b) =>
							a.startDate.localeCompare(b.startDate) ||
							a.startTime.localeCompare(b.startTime),
					);
			});
			const bestIndex = shallowRef(-1);
			watch(bestSlots, () => (bestIndex.value = -1));

			const revealNextBest = () => {
				if (!bestSlots.value.length) return;
				bestIndex.value =
					(bestIndex.value + 1) % bestSlots.value.length;
				revealSlot(bestSlots.value[bestIndex.value]!.id);
			};

			return {
				config,
				slots,
				calendar,
				slotActions,
				draft: vote ? { ...draft, onGridPointerdown: () => {} } : draft,
				now,
				vote,
				highlightedSlotId,
				revealSlot,
				bestSlots,
				bestIndex,
				revealNextBest,
			};
		},
	);

export { useProvideCalendarContext };

export const useCalendarContext = () => {
	const ctx = useInjectCalendarContext();
	if (!ctx)
		throw new Error(
			'useCalendarContext must be used within a CalendarRoot component',
		);
	return ctx;
};
