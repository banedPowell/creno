import type { CalendarTimeLabel } from '~/types/calendar';

const CELL_HEIGHT_DESKTOP = 32;
const CELL_HEIGHT_MOBILE = 40;

export const useCalendarGrid = (config: {
	hourStart: number;
	hourEnd: number;
	cellDuration: number;
}) => {
	const isDesktop = useMediaQuery('(min-width: 768px)', { ssrWidth: 768 });

	const cellHeight = computed(() =>
		Math.max(isDesktop.value ? CELL_HEIGHT_DESKTOP : CELL_HEIGHT_MOBILE),
	);

	const totalMinutes = computed(
		() => (config.hourEnd - config.hourStart) * 60,
	);

	const cellCount = computed(() => totalMinutes.value / config.cellDuration);

	const timeLabels = computed<CalendarTimeLabel[]>(() => {
		const labels: CalendarTimeLabel[] = [];
		for (let i = 0; i < cellCount.value; i++) {
			const mins = config.hourStart * 60 + i * config.cellDuration;
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			const time = minutesToTime(mins);
			labels.push({
				time,
				label: m === 0 ? `${String(h).padStart(2, '0')}:00` : time,
				index: i,
			});
		}
		return labels;
	});

	const cellsPerHour = computed(() => 60 / config.cellDuration);

	return {
		isDesktop,
		cellHeight,
		totalMinutes,
		cellCount,
		timeLabels,
		cellsPerHour,
	};
};

export const minutesToTime = (mins: number): string => {
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const timeToMinutes = (time: string): number => {
	const parts = time.split(':').map(Number);
	return parts[0]! * 60 + parts[1]!;
};

export const formatDate = (d: Date): string => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
};
