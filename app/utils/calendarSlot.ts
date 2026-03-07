import type { CalendarTimeSlot } from '~/types/calendar';

export const calendarSlotToApiSlot = (slot: CalendarTimeSlot) => {
	const start = new Date(`${slot.startDate}T${slot.startTime}:00`);
	const end = new Date(`${slot.endDate}T${slot.endTime}:00`);
	return {
		start: start.toISOString(),
		end: end.toISOString(),
	};
};
