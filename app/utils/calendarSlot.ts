import type { CalendarTimeSlot } from '~/types/calendar';
import {
	addDaysIso,
	formatDayMonth,
	formatWeekday,
	isoDate,
	minutesToTime,
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

// The way back from a stored slot: one running from a midnight to a later
// midnight is a whole-day slot, anything else stays timed within its day
export const apiSlotToCalendarSlot = (slot: {
	id: string;
	startTime: string | Date;
	duration: number;
}): CalendarTimeSlot => {
	const start = new Date(slot.startTime);
	const end = new Date(start.getTime() + slot.duration * 1000);
	const startDate = isoDate(start);
	const endDate = isoDate(end);
	const atMidnight = (date: Date) =>
		date.getHours() === 0 && date.getMinutes() === 0;

	if (atMidnight(start) && atMidnight(end) && endDate > startDate) {
		return {
			id: slot.id,
			startDate,
			endDate: addDaysIso(endDate, -1),
			startTime: '00:00',
			endTime: '00:00',
			allDay: true,
		};
	}

	return {
		id: slot.id,
		startDate,
		endDate: startDate,
		startTime: minutesToTime(start.getHours() * 60 + start.getMinutes()),
		endTime:
			endDate > startDate
				? '24:00'
				: minutesToTime(end.getHours() * 60 + end.getMinutes()),
	};
};

export const formatSlotLabel = (slot: CalendarTimeSlot): string => {
	const date = parseIsoDate(slot.startDate);
	if (slot.allDay)
		return slot.startDate === slot.endDate
			? `${formatWeekday(date)} ${formatDayMonth(date)}, journée entière`
			: formatAllDayLabel(slot);
	return `${formatWeekday(date)} ${formatDayMonth(date)}, ${slot.startTime} – ${slot.endTime}`;
};

export const formatAllDayLabel = (slot: CalendarTimeSlot): string => {
	if (slot.startDate === slot.endDate) return 'Journée entière';
	return `${formatDayMonth(parseIsoDate(slot.startDate))} → ${formatDayMonth(parseIsoDate(slot.endDate))}`;
};
