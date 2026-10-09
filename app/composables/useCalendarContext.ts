import type {
	CalendarConfig,
	CalendarTimeSlot,
	CalendarView,
} from '~/types/calendar';
import { createInjectionState } from '@vueuse/core';

const [useProvideCalendarContext, useInjectCalendarContext] =
	createInjectionState(
		(
			slots: Ref<CalendarTimeSlot[]>,
			config: CalendarConfig,
			defaultView: CalendarView,
		) => {
			// Coarse on purpose, the past only has to grow by the minute
			const now = useNow({ interval: 60_000 });
			const calendar = useCalendarView(defaultView);
			const slotActions = useCalendarSlots(slots);
			const draft = useSlotDraft(config, slotActions.addSlot, now);

			return { config, slots, calendar, slotActions, draft, now };
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
