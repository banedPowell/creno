import type {
	CalendarConfig,
	CalendarTimeSlot,
	CalendarView,
} from '~/types/calendar';
import { createInjectionState } from '@vueuse/core';
import { useCalendarGrid } from '~/composables/useCalendarGrid';
import { useCalendarNavigation } from '~/composables/useCalendarNavigation';
import { useCalendarSlots } from '~/composables/useCalendarSlots';
import { useCalendarDrag } from '~/composables/useCalendarDrag';

const [useProvideCalendarContext, useInjectCalendarContext] =
	createInjectionState(
		(
			slots: Ref<CalendarTimeSlot[]>,
			config: CalendarConfig,
			defaultView: CalendarView,
		) => {
			const grid = useCalendarGrid(config);
			const navigation = useCalendarNavigation(defaultView);
			const slotActions = useCalendarSlots(slots, config);
			const drag = useCalendarDrag({
				...config,
				isDesktop: grid.isDesktop,
				addSlot: slotActions.addSlot,
				removeSlot: slotActions.removeSlot,
				updateSlot: slotActions.updateSlot,
				slots,
			});

			return {
				config,
				slots,
				grid,
				navigation,
				slotActions,
				drag,
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
