import type { CalendarDayInfo, CalendarView } from '~/types/calendar';
import { formatDate } from '~/composables/useCalendarGrid';

const getMonday = (d: Date): Date => {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	date.setDate(diff);
	date.setHours(0, 0, 0, 0);
	return date;
};

const startOfDay = (d: Date): Date => {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
};

export const useCalendarNavigation = (defaultView: CalendarView = 'week') => {
	const isDesktop = useMediaQuery('(min-width: 768px)', { ssrWidth: 768 });

	const view = shallowRef<CalendarView>(defaultView);

	watch(
		isDesktop,
		(desktop) => {
			view.value = desktop ? 'week' : 'day';
		},
		{ immediate: true },
	);

	const currentDate = shallowRef(new Date());

	const weekStart = computed(() => getMonday(currentDate.value));

	const today = computed(() => startOfDay(new Date()));

	const canGoPrevPeriod = computed(() => {
		const cur = startOfDay(currentDate.value);
		if (view.value === 'day') {
			return cur > today.value;
		}
		return weekStart.value > today.value;
	});

	const canGoPrevBigPeriod = computed(() => {
		const cur = startOfDay(currentDate.value);
		if (view.value === 'day') {
			const prevWeek = new Date(cur);
			prevWeek.setDate(prevWeek.getDate() - 7);
			return prevWeek >= today.value;
		}
		return (
			cur.getFullYear() > today.value.getFullYear() ||
			(cur.getFullYear() === today.value.getFullYear() &&
				cur.getMonth() > today.value.getMonth())
		);
	});

	const days = computed<CalendarDayInfo[]>(() => {
		const todayStr = formatDate(new Date());
		if (view.value === 'day') {
			const d = new Date(currentDate.value);
			d.setHours(0, 0, 0, 0);
			const dateStr = formatDate(d);
			return [
				{
					date: d,
					dateStr,
					label: d.toLocaleDateString('fr-FR', {
						weekday: 'short',
						day: 'numeric',
						month: 'short',
					}),
					isToday: dateStr === todayStr,
				},
			];
		}

		const result: CalendarDayInfo[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart.value);
			d.setDate(d.getDate() + i);
			const dateStr = formatDate(d);
			result.push({
				date: d,
				dateStr,
				label: d.toLocaleDateString('fr-FR', {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
				}),
				isToday: dateStr === todayStr,
			});
		}
		return result;
	});

	const dateRangeLabel = computed(() => {
		if (view.value === 'day') {
			return currentDate.value.toLocaleDateString('fr-FR', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});
		}
		const end = new Date(weekStart.value);
		end.setDate(end.getDate() + 6);
		const startStr = weekStart.value.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
		});
		const endStr = end.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
		return `${startStr} — ${endStr}`;
	});

	const prevPeriod = () => {
		if (!canGoPrevPeriod.value) return;
		const d = new Date(currentDate.value);
		if (view.value === 'day') {
			d.setDate(d.getDate() - 1);
		} else {
			d.setDate(d.getDate() - 7);
		}
		currentDate.value = d;
	};

	const nextPeriod = () => {
		const d = new Date(currentDate.value);
		if (view.value === 'day') {
			d.setDate(d.getDate() + 1);
		} else {
			d.setDate(d.getDate() + 7);
		}
		currentDate.value = d;
	};

	const prevBigPeriod = () => {
		if (!canGoPrevBigPeriod.value) return;
		const d = new Date(currentDate.value);
		if (view.value === 'day') {
			d.setDate(d.getDate() - 7);
		} else {
			d.setMonth(d.getMonth() - 1);
		}
		currentDate.value = d;
	};

	const nextBigPeriod = () => {
		const d = new Date(currentDate.value);
		if (view.value === 'day') {
			d.setDate(d.getDate() + 7);
		} else {
			d.setMonth(d.getMonth() + 1);
		}
		currentDate.value = d;
	};

	const goToday = () => {
		currentDate.value = new Date();
	};

	return {
		view,
		currentDate,
		days,
		dateRangeLabel,
		isDesktop,
		canGoPrevPeriod,
		canGoPrevBigPeriod,
		prevPeriod,
		nextPeriod,
		prevBigPeriod,
		nextBigPeriod,
		goToday,
	};
};
