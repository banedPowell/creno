import type { CalendarTimeSlot, CalendarSlotPosition } from '~/types/calendar';
import { timeToMinutes } from '~/composables/useCalendarGrid';

let slotIdCounter = 0;

const generateSlotId = (): string => {
	return `slot-${++slotIdCounter}`;
};

export const useCalendarSlots = (
	slots: Ref<CalendarTimeSlot[]>,
	config: { hourStart: number; hourEnd: number; cellDuration: number },
) => {
	const addSlot = (
		startDate: string,
		endDate: string,
		startTime: string,
		endTime: string,
	) => {
		const newSlot: CalendarTimeSlot = {
			id: generateSlotId(),
			startDate,
			endDate,
			startTime,
			endTime,
		};

		const filtered = slots.value.filter((s) => !overlaps(s, newSlot));

		slots.value = [...filtered, newSlot];
	};

	const removeSlot = (id: string) => {
		slots.value = slots.value.filter((s) => s.id !== id);
	};

	const updateSlot = (id: string, updates: Partial<CalendarTimeSlot>) => {
		slots.value = slots.value.map((s) =>
			s.id === id ? { ...s, ...updates } : s,
		);
	};

	const getSlotsForDay = (
		dateStr: string,
		cellHeight: number,
	): CalendarSlotPosition[] => {
		const hourStartMins = config.hourStart * 60;
		const hourEndMins = config.hourEnd * 60;

		return slots.value
			.filter((s) => dateStr >= s.startDate && dateStr <= s.endDate)
			.map((s) => {
				const isStart = dateStr === s.startDate;
				const isEnd = dateStr === s.endDate;

				const segStartMins = isStart
					? timeToMinutes(s.startTime)
					: hourStartMins;
				const segEndMins = isEnd
					? timeToMinutes(s.endTime)
					: hourEndMins;

				const clampedStart = Math.max(segStartMins, hourStartMins);
				const clampedEnd = Math.min(segEndMins, hourEndMins);

				const top =
					((clampedStart - hourStartMins) / config.cellDuration) *
					cellHeight;
				const height =
					((clampedEnd - clampedStart) / config.cellDuration) *
					cellHeight;

				return { slot: s, top, height, isStart, isEnd };
			})
			.filter((p) => p.height > 0);
	};

	return {
		addSlot,
		removeSlot,
		updateSlot,
		getSlotsForDay,
	};
};

const overlaps = (a: CalendarTimeSlot, b: CalendarTimeSlot): boolean => {
	if (a.endDate < b.startDate || a.startDate > b.endDate) return false;

	if (a.startDate === a.endDate && b.startDate === b.endDate) {
		if (a.startDate !== b.startDate) return false;
		return (
			timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
			timeToMinutes(a.endTime) > timeToMinutes(b.startTime)
		);
	}

	const aStart = `${a.startDate}T${a.startTime}`;
	const aEnd = `${a.endDate}T${a.endTime}`;
	const bStart = `${b.startDate}T${b.startTime}`;
	const bEnd = `${b.endDate}T${b.endTime}`;

	return aStart < bEnd && aEnd > bStart;
};
