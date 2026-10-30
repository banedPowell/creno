import type { CalendarConfig, CalendarTimeSlot } from '~/types/calendar';
import {
	earliestMinutes,
	minutesToTime,
	timeToMinutes,
} from '~/utils/calendarDates';
import { DRAG_THRESHOLD, PX_PER_MINUTE } from '~/utils/calendarLayout';

type DragMode = 'move' | 'resize-top' | 'resize-bottom';

// Pointer-capture drag to move a block (across days of the visible grid) or
// resize it from either edge, snapped to the calendar step. The block is
// previewed in place, the real update only happens on drop
export const useSlotDrag = (
	slot: MaybeRefOrGetter<CalendarTimeSlot>,
	config: CalendarConfig,
	options: {
		onCommit: (updates: Partial<CalendarTimeSlot>) => void;
		now: Readonly<Ref<Date>>;
	},
) => {
	const dragging = shallowRef(false);
	// Keeps the click that ends a drag from removing the slot
	const suppressed = shallowRef(false);
	const mode = shallowRef<DragMode>('move');
	const deltaMinutes = shallowRef(0);
	const deltaX = shallowRef(0);
	const targetDate = shallowRef<string | null>(null);

	let active = false;
	let startX = 0;
	let startY = 0;
	let columns: { rect: DOMRect; date: string }[] = [];
	let columnIndex = -1;

	const range = computed(() => {
		const source = toValue(slot);
		return {
			start: timeToMinutes(source.startTime),
			end: timeToMinutes(source.endTime),
		};
	});

	// The first minute a slot may start at on a day, past the visible hours and
	// the current time
	const lowerBound = (date: string) =>
		Math.max(
			config.hourStart * 60,
			earliestMinutes(date, options.now.value, config.snapMinutes),
		);

	// The day and times the block shows and would be saved with, clamped to
	// the visible hours, out of the past and to at least one step long
	const preview = computed(() => {
		const { start, end } = range.value;
		const source = toValue(slot).startDate;
		const date = (dragging.value && targetDate.value) || source;
		const max = config.hourEnd * 60;
		const delta = dragging.value ? deltaMinutes.value : 0;

		if (mode.value === 'move') {
			const low = lowerBound(date) - start;
			const high = max - end;
			// No room left on that day, the block stays where it was
			if (low > high) return { date: source, start, end };
			const shift = Math.min(Math.max(delta, low), high);
			return { date, start: start + shift, end: end + shift };
		}
		if (mode.value === 'resize-top') {
			return {
				date,
				start: Math.min(
					Math.max(start + delta, lowerBound(date)),
					end - config.snapMinutes,
				),
				end,
			};
		}
		return {
			date,
			start,
			end: Math.max(
				Math.min(end + delta, max),
				start + config.snapMinutes,
			),
		};
	});

	const reset = () => {
		active = false;
		dragging.value = false;
		deltaMinutes.value = 0;
		deltaX.value = 0;
		targetDate.value = null;
	};

	// Let the trailing click event pass before re-enabling it
	const release = () => {
		setTimeout(() => {
			suppressed.value = false;
		});
	};

	const onPointerdown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		event.stopPropagation();

		const target = event.currentTarget as HTMLElement;
		const handle = (event.target as HTMLElement).closest<HTMLElement>(
			'[data-resize-handle]',
		)?.dataset.resizeHandle;
		mode.value =
			handle === 'top'
				? 'resize-top'
				: handle === 'bottom'
					? 'resize-bottom'
					: 'move';
		startX = event.clientX;
		startY = event.clientY;

		// Measured once per drag, the day columns are the geometry source
		const grid = target.closest('[data-week-grid]');
		columns = grid
			? [...grid.querySelectorAll<HTMLElement>('[data-day-column]')].map(
					(column) => ({
						rect: column.getBoundingClientRect(),
						date: column.dataset.date!,
					}),
				)
			: [];
		columnIndex = columns.findIndex(
			({ rect }) =>
				event.clientX >= rect.left && event.clientX < rect.right,
		);

		target.setPointerCapture(event.pointerId);
		active = true;
	};

	const onPointermove = (event: PointerEvent) => {
		if (!active) return;

		const dx = event.clientX - startX;
		const dy = event.clientY - startY;

		if (!dragging.value) {
			if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
			dragging.value = true;
			suppressed.value = true;
		}

		deltaMinutes.value =
			Math.round(dy / PX_PER_MINUTE / config.snapMinutes) *
			config.snapMinutes;

		if (mode.value === 'move' && columnIndex !== -1) {
			const index = columns.findIndex(
				({ rect }) =>
					event.clientX >= rect.left && event.clientX < rect.right,
			);
			const date = index === -1 ? null : columns[index]!.date;
			// A past day is not a drop target, the block stays on the last
			// valid one
			if (
				date &&
				earliestMinutes(date, options.now.value, config.snapMinutes) !==
					Infinity
			) {
				targetDate.value = date;
				deltaX.value =
					columns[index]!.rect.left - columns[columnIndex]!.rect.left;
			}
		}
	};

	const onPointerup = () => {
		if (active && dragging.value) {
			const { date, start, end } = preview.value;
			options.onCommit({
				startDate: date,
				endDate: date,
				startTime: minutesToTime(start),
				endTime: minutesToTime(end),
			});
		}
		reset();
		release();
	};

	const onPointercancel = () => {
		reset();
		release();
	};

	useEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Escape' && dragging.value) reset();
	});
	useEventListener('blur', () => {
		if (active || suppressed.value) {
			reset();
			release();
		}
	});

	return {
		dragging,
		suppressed,
		mode,
		// Back to its own column when the target day has no room for it
		deltaX: computed(() =>
			preview.value.date === toValue(slot).startDate ? 0 : deltaX.value,
		),
		preview,
		onPointerdown,
		onPointermove,
		onPointerup,
		onPointercancel,
	};
};
