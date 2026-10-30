import type { CalendarDay } from '~/types/calendar';

export const startOfDay = (date: Date): Date =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Clamped to the last day of the target month, so Jan 31 + 1 month is Feb 28
export const addMonths = (date: Date, months: number): Date => {
	const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
	const lastDay = new Date(
		target.getFullYear(),
		target.getMonth() + 1,
		0,
	).getDate();
	target.setDate(Math.min(date.getDate(), lastDay));
	return target;
};

export const startOfWeek = (date: Date): Date => {
	const day = startOfDay(date);
	return addDays(day, -((day.getDay() + 6) % 7));
};

export const startOfMonth = (date: Date): Date =>
	new Date(date.getFullYear(), date.getMonth(), 1);

export const monthIndex = (date: Date): number =>
	date.getFullYear() * 12 + date.getMonth();

export const isoDate = (date: Date): string => {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
};

export const parseIsoDate = (iso: string): Date => {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y!, m! - 1, d!);
};

export const addDaysIso = (iso: string, days: number): string =>
	isoDate(addDays(parseIsoDate(iso), days));

export const timeToMinutes = (time: string): number => {
	const [h, m] = time.split(':').map(Number);
	return h! * 60 + m!;
};

export const minutesToTime = (minutes: number): string => {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// The first minute of a day a new slot may start at: none on a past day, the
// next step after the current time today, any time on a day to come
export const earliestMinutes = (
	dateStr: string,
	now: Date,
	snap: number,
): number => {
	const today = isoDate(now);
	if (dateStr < today) return Infinity;
	if (dateStr > today) return 0;
	// Wall-clock minutes, a day with a clock change still reads 0 to 24 h
	const minutes =
		now.getHours() * 60 +
		now.getMinutes() +
		(now.getSeconds() * 1000 + now.getMilliseconds()) / 60_000;
	return Math.ceil(minutes / snap) * snap;
};

export const eachDay = (start: Date, count: number): Date[] =>
	Array.from({ length: count }, (_, index) => addDays(start, index));

// Always 6 rows of 7 days so the grid height never jumps between months
export const monthWeekStarts = (date: Date): Date[] => {
	const start = startOfWeek(startOfMonth(date));
	return Array.from({ length: 6 }, (_, index) => addDays(start, index * 7));
};

export const toCalendarDay = (date: Date, today = new Date()): CalendarDay => {
	const dateStr = isoDate(date);
	const todayStr = isoDate(today);
	return {
		date,
		dateStr,
		isToday: dateStr === todayStr,
		isPast: dateStr < todayStr,
	};
};

// The day under a point, read off the `data-date` of the topmost cell there,
// so a drag keeps working when it crosses into another week row
export const dateAtPoint = (x: number, y: number): string | null => {
	for (const element of document.elementsFromPoint(x, y)) {
		const iso = (element as HTMLElement).dataset?.date;
		if (iso) return iso;
	}
	return null;
};

// Building a formatter costs far more than formatting with it, and these run
// for every day cell and slot rendered
const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const dayMonthFormat = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'short',
});
const longDayMonthFormat = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
});
const fullDateFormat = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});
const monthYearFormat = new Intl.DateTimeFormat('fr-FR', {
	month: 'long',
	year: 'numeric',
});

export const formatWeekday = (date: Date): string => weekdayFormat.format(date);

export const formatDayMonth = (date: Date): string =>
	dayMonthFormat.format(date);

export const formatFullDate = (date: Date): string =>
	fullDateFormat.format(date);

export const formatMonthYear = (date: Date): string =>
	monthYearFormat.format(date);

export const formatHour = (hour: number): string =>
	`${String(hour).padStart(2, '0')}:00`;

export const formatWeekRange = (start: Date): string => {
	const end = addDays(start, 6);
	return `${longDayMonthFormat.format(start)} — ${longDayMonthFormat.format(end)} ${end.getFullYear()}`;
};
