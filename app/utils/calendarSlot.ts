import type { CalendarTimeSlot } from '~/types/calendar';
import {
	addDaysIso,
	formatDayMonth,
	parseIsoDate,
	timeToMinutes,
} from '~/utils/calendarDates';

const toDate = (dateStr: string, time: string): Date => {
	const date = parseIsoDate(dateStr);
	date.setMinutes(timeToMinutes(time));
	return date;
};

// All-day slots end at midnight after their last day, so the API always
// receives a half-open [start, end) range
export const calendarSlotToApiSlot = (slot: CalendarTimeSlot) => {
	const start = toDate(
		slot.startDate,
		slot.allDay ? '00:00' : slot.startTime,
	);
	const end = slot.allDay
		? toDate(addDaysIso(slot.endDate, 1), '00:00')
		: toDate(slot.endDate, slot.endTime);
	return {
		start: start.toISOString(),
		end: end.toISOString(),
	};
};

export const formatAllDayLabel = (slot: CalendarTimeSlot): string => {
	if (slot.startDate === slot.endDate) return 'Journée entière';
	return `${formatDayMonth(parseIsoDate(slot.startDate))} → ${formatDayMonth(parseIsoDate(slot.endDate))}`;
};
