import type { CalendarConfig, CalendarTimeSlot } from '~/types/calendar';
import {
	dateAtPoint,
	earliestMinutes,
	isoDate,
	minutesToTime,
} from '~/utils/calendarDates';
import {
	DRAFT_SLOT_ID,
	DRAG_THRESHOLD,
	minutesInColumn,
} from '~/utils/calendarLayout';

// Where a gesture started. A timed column draws hours inside that one day, the
// month grid draws whole days and is the only place a slot can span several
export interface GridTarget {
	kind: 'timed' | 'month';
	dateStr: string;
}

interface Gesture {
	target: GridTarget;
	pointerId: number;
	x: number;
	y: number;
	rect: DOMRect;
	anchorMinutes: number;
	earliest: number;
	currentDate: string;
	moved: boolean;
}

// A touch has to be held still this long before it draws, otherwise it stays
// a scroll
const LONG_PRESS_DELAY = 350;
const LONG_PRESS_DISTANCE = 12;

export const useSlotDraft = (
	config: CalendarConfig,
	addSlot: (slot: Omit<CalendarTimeSlot, 'id'>) => void,
	now: Readonly<Ref<Date>>,
) => {
	const draft = shallowRef<Omit<CalendarTimeSlot, 'id'> | null>(null);
	// Stays up for the tick after a gesture ends, so the swipe handler reading
	// it on `touchend` still sees a draw rather than a swipe
	const busy = shallowRef(false);

	const draftSlot = computed<CalendarTimeSlot | null>(
		() => draft.value && { ...draft.value, id: DRAFT_SLOT_ID },
	);

	let gesture: Gesture | null = null;
	let longPress: ReturnType<typeof setTimeout> | null = null;

	const timedSlot = (
		dateStr: string,
		from: number,
		to: number,
	): Omit<CalendarTimeSlot, 'id'> => ({
		startDate: dateStr,
		endDate: dateStr,
		startTime: minutesToTime(from),
		endTime: minutesToTime(to),
	});

	const allDaySlot = (
		a: string,
		b: string,
	): Omit<CalendarTimeSlot, 'id'> => ({
		startDate: a < b ? a : b,
		endDate: a < b ? b : a,
		startTime: '00:00',
		endTime: '00:00',
		allDay: true,
	});

	// What a press without a drag draws: a default-length slot, or that one day
	const clickGeometry = (current: Gesture) => {
		if (current.target.kind === 'month')
			return allDaySlot(current.target.dateStr, current.target.dateStr);

		const from = current.anchorMinutes;
		const to = Math.min(
			config.hourEnd * 60,
			from + config.clickSlotDuration,
		);
		return timedSlot(current.target.dateStr, from, to);
	};

	const dragGeometry = (current: Gesture, event: PointerEvent) => {
		if (current.target.kind === 'month') {
			// Keeps the last day it was over once the pointer leaves the grid
			// or crosses into the past
			const date = dateAtPoint(event.clientX, event.clientY);
			if (date && date >= isoDate(now.value)) current.currentDate = date;
			return allDaySlot(current.target.dateStr, current.currentDate);
		}

		// Only the vertical position is read against the column the gesture
		// started in, so a timed slot can never leave its day
		const minutes = minutesInColumn(
			event.clientY,
			current.rect,
			config,
			config.snapMinutes,
		);
		const from = Math.max(
			Math.min(current.anchorMinutes, minutes),
			current.earliest,
		);
		const to = Math.max(
			Math.max(current.anchorMinutes, minutes),
			from + config.snapMinutes,
		);
		return timedSlot(
			current.target.dateStr,
			from,
			Math.min(to, config.hourEnd * 60),
		);
	};

	const clearLongPress = () => {
		if (longPress) clearTimeout(longPress);
		longPress = null;
	};

	const endGesture = () => {
		clearLongPress();
		gesture = null;
		draft.value = null;
		setTimeout(() => {
			busy.value = false;
		});
	};

	const onPointermove = (event: PointerEvent) => {
		if (!gesture || event.pointerId !== gesture.pointerId) return;

		const distance = Math.hypot(
			event.clientX - gesture.x,
			event.clientY - gesture.y,
		);

		// A finger that moves before the long press fires is scrolling
		if (longPress) {
			if (distance > LONG_PRESS_DISTANCE) endGesture();
			return;
		}

		if (!gesture.moved) {
			if (distance < DRAG_THRESHOLD) return;
			gesture.moved = true;
		}

		draft.value = dragGeometry(gesture, event);
	};

	const onPointerup = (event: PointerEvent) => {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		if (!longPress) {
			const slot = gesture.moved ? draft.value : clickGeometry(gesture);
			if (slot) addSlot(slot);
		}
		endGesture();
	};

	const onGridPointerdown = (event: PointerEvent, target: GridTarget) => {
		if (event.button !== 0 || gesture) return;
		if ((event.target as HTMLElement).closest('[data-calendar-slot]'))
			return;

		const rect = (
			event.currentTarget as HTMLElement
		).getBoundingClientRect();
		// The very bottom edge floors to the end of the day, one step above it
		// is the last place a slot can start
		const anchorMinutes = Math.min(
			minutesInColumn(
				event.clientY,
				rect,
				config,
				config.snapMinutes,
				'floor',
			),
			config.hourEnd * 60 - config.snapMinutes,
		);
		const earliest = earliestMinutes(
			target.dateStr,
			now.value,
			config.snapMinutes,
		);
		// Nothing can be drawn on the past, a whole day counts once it is over
		if (
			target.kind === 'month'
				? earliest === Infinity
				: anchorMinutes < earliest
		)
			return;

		gesture = {
			target,
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			rect,
			anchorMinutes,
			earliest,
			currentDate: target.dateStr,
			moved: false,
		};
		busy.value = true;

		if (event.pointerType === 'touch') {
			longPress = setTimeout(() => {
				longPress = null;
				if (!gesture) return;
				gesture.moved = true;
				draft.value = clickGeometry(gesture);
			}, LONG_PRESS_DELAY);
		} else {
			// Or the drag selects the hour labels it passes over
			event.preventDefault();
		}
	};

	useEventListener('pointermove', onPointermove);
	useEventListener('pointerup', onPointerup);
	useEventListener('pointercancel', (event: PointerEvent) => {
		if (gesture && event.pointerId === gesture.pointerId) endGesture();
	});
	// Once a long press has started drawing, the finger must stop scrolling
	useEventListener(
		'touchmove',
		(event: TouchEvent) => {
			if (gesture?.moved) event.preventDefault();
		},
		{ passive: false },
	);
	useEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Escape' && gesture) endGesture();
	});
	// Releasing the pointer outside the window fires neither pointerup nor
	// pointercancel
	useEventListener('blur', () => {
		if (gesture) endGesture();
	});

	tryOnScopeDispose(clearLongPress);

	return { draftSlot, busy, onGridPointerdown };
};
