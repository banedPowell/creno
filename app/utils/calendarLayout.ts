import type { CalendarTimeSlot } from '~/types/calendar';
import { timeToMinutes } from '~/utils/calendarDates';

export const HOUR_HEIGHT = 64;
export const PX_PER_MINUTE = HOUR_HEIGHT / 60;
// The painted minimum, not a duration floor: a shorter slot still draws at
// this height to stay readable
export const MIN_SLOT_MINUTES = 30;
// How far the pointer has to travel before a gesture counts as a drag rather
// than a click
export const DRAG_THRESHOLD = 5;
// The id the slot being drawn carries through the layout, so a view can tell
// it apart from a real one
export const DRAFT_SLOT_ID = 'draft';

export interface HourBounds {
	hourStart: number;
	hourEnd: number;
}

export interface PositionedSlot {
	slot: CalendarTimeSlot;
	top: number;
	height: number;
	left: number;
	width: number;
}

export interface AllDayPositionedSlot {
	slot: CalendarTimeSlot;
	colStart: number;
	colSpan: number;
	lane: number;
}

// Cluster + column packing: slots that transitively overlap form a cluster,
// each cluster splits into the minimum number of columns
export const layoutDay = (
	slots: CalendarTimeSlot[],
	dateStr: string,
	{ hourStart, hourEnd }: HourBounds,
): PositionedSlot[] => {
	const dayStart = hourStart * 60;
	const dayEnd = hourEnd * 60;

	const items = slots
		.filter((slot) => !slot.allDay && slot.startDate === dateStr)
		.map((slot) => {
			const startMin = Math.max(dayStart, timeToMinutes(slot.startTime));
			const endMin = Math.min(dayEnd, timeToMinutes(slot.endTime));
			return { slot, startMin, endMin };
		})
		.filter((item) => item.endMin > item.startMin)
		// Short slots are drawn past their real end, so the packing runs on
		// what is painted or they would overlap on screen
		.map((item) => ({
			...item,
			endMin: Math.max(item.endMin, item.startMin + MIN_SLOT_MINUTES),
		}))
		.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

	const positioned: PositionedSlot[] = [];
	let cluster: typeof items = [];
	let clusterEnd = -Infinity;

	const flush = () => {
		const columns: number[] = [];
		const assigned = cluster.map((item) => {
			let index = columns.findIndex((end) => end <= item.startMin);
			if (index === -1) index = columns.length;
			columns[index] = item.endMin;
			return index;
		});

		for (const [index, item] of cluster.entries()) {
			positioned.push({
				slot: item.slot,
				top: (item.startMin - dayStart) * PX_PER_MINUTE,
				height: (item.endMin - item.startMin) * PX_PER_MINUTE,
				left: (assigned[index]! / columns.length) * 100,
				width: 100 / columns.length,
			});
		}
	};

	for (const item of items) {
		if (cluster.length && item.startMin >= clusterEnd) {
			flush();
			cluster = [];
			clusterEnd = -Infinity;
		}
		cluster.push(item);
		clusterEnd = Math.max(clusterEnd, item.endMin);
	}
	if (cluster.length) flush();

	return positioned;
};

// Greedy lane packing for the all-day bars spanning a row of days
export const layoutAllDay = (
	slots: CalendarTimeSlot[],
	days: string[],
): AllDayPositionedSlot[] => {
	const first = days[0];
	const last = days.at(-1);
	if (!first || !last) return [];

	const items = slots
		.filter(
			(slot) =>
				slot.allDay && slot.startDate <= last && slot.endDate >= first,
		)
		.map((slot) => {
			const colStart = days.findIndex((day) => day >= slot.startDate);
			const colEnd = days.findLastIndex((day) => day <= slot.endDate) + 1;
			return { slot, colStart, colSpan: colEnd - colStart };
		})
		.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);

	const lanes: number[] = [];

	return items.map((item) => {
		let lane = lanes.findIndex((end) => end <= item.colStart);
		if (lane === -1) lane = lanes.length;
		lanes[lane] = item.colStart + item.colSpan;
		return { ...item, lane };
	});
};

// The minute of the day a pointer sits at inside a day column, snapped and
// clamped to the visible hours. A click floors to the step it landed in, a
// drag rounds to the edge it is closest to
export const minutesInColumn = (
	clientY: number,
	rect: DOMRect,
	{ hourStart, hourEnd }: HourBounds,
	snap: number,
	mode: 'floor' | 'nearest' = 'nearest',
): number => {
	const raw = (clientY - rect.top) / PX_PER_MINUTE;
	const snapped =
		mode === 'floor'
			? Math.floor(raw / snap) * snap
			: Math.round(raw / snap) * snap;
	return Math.min(
		hourEnd * 60,
		Math.max(hourStart * 60, hourStart * 60 + snapped),
	);
};

// The geometry a slot block and the draft ghost share
export const slotBlockStyle = (
	positioned: Pick<PositionedSlot, 'top' | 'height' | 'left' | 'width'>,
) => ({
	// Clears the hour lines it starts and ends on, the same gap it leaves on
	// both inline edges, so the grid shows between blocks
	top: `${positioned.top + 1}px`,
	height: `${positioned.height - 2}px`,
	insetInlineStart: `calc(${positioned.left}% + 2px)`,
	width: `calc(${positioned.width}% - 4px)`,
});
