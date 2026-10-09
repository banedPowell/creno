export interface CalendarTimeSlot {
	id: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD, inclusive (= startDate for a timed slot)
	startTime: string; // HH:mm
	endTime: string; // HH:mm, may be 24:00
	allDay?: true;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarConfig {
	hourStart: number;
	hourEnd: number;
	snapMinutes: number;
	clickSlotDuration: number; // minutes
}

export interface CalendarDay {
	date: Date;
	dateStr: string; // YYYY-MM-DD
	isToday: boolean;
	isPast: boolean;
}
