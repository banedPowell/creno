import type { CalendarDay, CalendarView } from '~/types/calendar';
import {
	addDays,
	addMonths,
	eachDay,
	formatFullDate,
	formatMonthYear,
	formatWeekRange,
	monthIndex,
	monthWeekStarts,
	startOfDay,
	startOfWeek,
	toCalendarDay,
} from '~/utils/calendarDates';

export const useCalendarView = (defaultView: CalendarView = 'week') => {
	const isDesktop = useMediaQuery('(min-width: 768px)', { ssrWidth: 768 });

	const view = shallowRef<CalendarView>(defaultView);
	const currentDate = shallowRef(startOfDay(new Date()));
	const today = computed(() => startOfDay(new Date()));

	// A phone has no room for seven timed columns, the month grid still fits
	watch(
		isDesktop,
		(desktop) => {
			if (view.value !== 'month') view.value = desktop ? 'week' : 'day';
		},
		{ immediate: true },
	);

	const weekStart = computed(() => startOfWeek(currentDate.value));

	const days = computed<CalendarDay[]>(() => {
		const dates =
			view.value === 'day'
				? [currentDate.value]
				: eachDay(weekStart.value, 7);
		return dates.map((date) => toCalendarDay(date));
	});

	const monthWeeks = computed(() => monthWeekStarts(currentDate.value));

	const canGoPrevPeriod = computed(() => {
		if (view.value === 'day') return currentDate.value > today.value;
		if (view.value === 'week') return weekStart.value > today.value;
		return monthIndex(currentDate.value) > monthIndex(today.value);
	});

	const canGoPrevBigPeriod = computed(() => {
		if (view.value === 'day')
			return addDays(currentDate.value, -7) >= today.value;
		if (view.value === 'week')
			return monthIndex(currentDate.value) > monthIndex(today.value);
		return monthIndex(currentDate.value) - 12 >= monthIndex(today.value);
	});

	const periodLabel = computed(() => {
		if (view.value === 'day') return formatFullDate(currentDate.value);
		if (view.value === 'week') return formatWeekRange(weekStart.value);
		return formatMonthYear(currentDate.value);
	});

	const shift = (direction: 1 | -1, big: boolean): Date => {
		const date = currentDate.value;
		if (view.value === 'day')
			return addDays(date, direction * (big ? 7 : 1));
		if (view.value === 'week')
			return big
				? addMonths(date, direction)
				: addDays(date, direction * 7);
		return addMonths(date, direction * (big ? 12 : 1));
	};

	// Going back never lands before today, a period that straddles it opens on it
	const goTo = (date: Date) => {
		currentDate.value = date < today.value ? today.value : date;
	};

	const prevPeriod = () => {
		if (canGoPrevPeriod.value) goTo(shift(-1, false));
	};
	const nextPeriod = () => goTo(shift(1, false));
	const prevBigPeriod = () => {
		if (canGoPrevBigPeriod.value) goTo(shift(-1, true));
	};
	const nextBigPeriod = () => goTo(shift(1, true));
	const goToday = () => goTo(today.value);

	const openDay = (date: Date) => {
		goTo(date);
		view.value = 'day';
	};

	return {
		view,
		currentDate,
		isDesktop,
		days,
		monthWeeks,
		periodLabel,
		canGoPrevPeriod,
		canGoPrevBigPeriod,
		prevPeriod,
		nextPeriod,
		prevBigPeriod,
		nextBigPeriod,
		goToday,
		openDay,
	};
};
