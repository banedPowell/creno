import type { CalendarDragState, CalendarTimeSlot } from '~/types/calendar';
import { minutesToTime } from '~/composables/useCalendarGrid';

export const useCalendarDrag = (config: {
	hourStart: number;
	hourEnd: number;
	cellDuration: number;
	dragStep: number;
	clickSlotDuration: number;
	isDesktop: Ref<boolean>;
	addSlot: (
		startDate: string,
		endDate: string,
		startTime: string,
		endTime: string,
	) => void;
	removeSlot: (id: string) => void;
	updateSlot: (id: string, updates: Partial<CalendarTimeSlot>) => void;
	slots: Ref<CalendarTimeSlot[]>;
}) => {
	const dragState = shallowRef<CalendarDragState>({
		isDragging: false,
		mode: 'create',
		resizeEdge: null,
		resizeSlotId: null,
		originalStartTime: null,
		originalEndTime: null,
		startDateStr: '',
		endDateStr: '',
		startIndex: 0,
		endIndex: 0,
	});

	const scrollContainer = shallowRef<HTMLElement | null>(null);
	const isScrollLocked = useScrollLock(scrollContainer);
	const wasDragging = shallowRef(false);

	const setDragState = (partial: Partial<CalendarDragState>) => {
		dragState.value = { ...dragState.value, ...partial };
	};

	const startCreate = (dateStr: string, cellIndex: number) => {
		setDragState({
			isDragging: true,
			mode: 'create',
			resizeEdge: null,
			resizeSlotId: null,
			startDateStr: dateStr,
			endDateStr: dateStr,
			startIndex: cellIndex,
			endIndex: cellIndex,
		});
		if (!config.isDesktop.value) {
			isScrollLocked.value = true;
		}
	};

	const startResize = (
		slotId: string,
		edge: 'top' | 'bottom',
		dateStr: string,
		cellIndex: number,
	) => {
		const slot = config.slots.value.find((s) => s.id === slotId);
		setDragState({
			isDragging: true,
			mode: 'resize',
			resizeEdge: edge,
			resizeSlotId: slotId,
			originalStartTime: slot?.startTime ?? null,
			originalEndTime: slot?.endTime ?? null,
			startDateStr: dateStr,
			endDateStr: dateStr,
			startIndex: cellIndex,
			endIndex: cellIndex,
		});
		if (!config.isDesktop.value) {
			isScrollLocked.value = true;
		}
	};

	const updateDrag = (dateStr: string, cellIndex: number) => {
		if (!dragState.value.isDragging) return;
		setDragState({
			endDateStr: dateStr,
			endIndex: cellIndex,
		});
		if (dragState.value.mode === 'resize') {
			applyResize(dragState.value);
		}
	};

	const endDrag = () => {
		if (!dragState.value.isDragging) return;

		const state = dragState.value;

		if (state.mode === 'create') {
			finishCreate(state);
		}

		wasDragging.value = true;
		setTimeout(() => {
			wasDragging.value = false;
		}, 0);

		setDragState({
			isDragging: false,
			mode: 'create',
			resizeEdge: null,
			resizeSlotId: null,
			originalStartTime: null,
			originalEndTime: null,
		});
		isScrollLocked.value = false;
	};

	const finishCreate = (state: CalendarDragState) => {
		const dates = [state.startDateStr, state.endDateStr].sort() as [
			string,
			string,
		];
		const startDateStr = dates[0];
		const endDateStr = dates[1];

		let minIdx: number;
		let maxIdx: number;

		if (startDateStr === endDateStr) {
			minIdx = Math.min(state.startIndex, state.endIndex);
			maxIdx = Math.max(state.startIndex, state.endIndex);
		} else if (state.startDateStr <= state.endDateStr) {
			minIdx = state.startIndex;
			maxIdx = state.endIndex;
		} else {
			minIdx = state.endIndex;
			maxIdx = state.startIndex;
		}

		const startMins = config.hourStart * 60 + minIdx * config.cellDuration;
		let endMins =
			config.hourStart * 60 + (maxIdx + 1) * config.cellDuration;

		const isClick =
			state.startIndex === state.endIndex &&
			state.startDateStr === state.endDateStr;

		if (isClick) {
			endMins = startMins + config.clickSlotDuration;
		}

		const hourEndMins = config.hourEnd * 60;
		if (endMins > hourEndMins) {
			endMins = hourEndMins;
		}

		if (endMins <= startMins) return;

		config.addSlot(
			startDateStr,
			endDateStr,
			minutesToTime(startMins),
			minutesToTime(endMins),
		);
	};

	const applyResize = (state: CalendarDragState) => {
		if (!state.resizeSlotId || !state.resizeEdge) return;
		if (!state.originalStartTime || !state.originalEndTime) return;

		const hourEndMins = config.hourEnd * 60;
		const hourStartMins = config.hourStart * 60;

		if (state.resizeEdge === 'top') {
			const newMins =
				config.hourStart * 60 + state.endIndex * config.cellDuration;
			const clampedMins = Math.max(
				hourStartMins,
				Math.min(
					newMins,
					timeToMinutes(state.originalEndTime) - config.dragStep,
				),
			);
			config.updateSlot(state.resizeSlotId, {
				startTime: minutesToTime(clampedMins),
			});
		} else {
			const endMins =
				config.hourStart * 60 +
				(state.endIndex + 1) * config.cellDuration;
			const clampedMins = Math.min(
				hourEndMins,
				Math.max(
					endMins,
					timeToMinutes(state.originalStartTime) + config.dragStep,
				),
			);
			config.updateSlot(state.resizeSlotId, {
				endTime: minutesToTime(clampedMins),
			});
		}
	};

	const isDragHighlight = (dateStr: string, cellIndex: number): boolean => {
		const state = dragState.value;
		if (!state.isDragging || state.mode !== 'create') return false;

		const dates = [state.startDateStr, state.endDateStr].sort() as [
			string,
			string,
		];
		if (dateStr < dates[0] || dateStr > dates[1]) return false;

		if (dates[0] === dates[1]) {
			const minIdx = Math.min(state.startIndex, state.endIndex);
			const maxIdx = Math.max(state.startIndex, state.endIndex);
			return cellIndex >= minIdx && cellIndex <= maxIdx;
		}

		if (dateStr === dates[0]) {
			const idx =
				state.startDateStr <= state.endDateStr
					? state.startIndex
					: state.endIndex;
			return cellIndex >= idx;
		}
		if (dateStr === dates[1]) {
			const idx =
				state.startDateStr <= state.endDateStr
					? state.endIndex
					: state.startIndex;
			return cellIndex <= idx;
		}
		return true;
	};

	const getDragPreview = (
		dateStr: string,
		cellHeight: number,
	): {
		top: number;
		height: number;
		startTime: string;
		endTime: string;
	} | null => {
		const state = dragState.value;
		if (!state.isDragging || state.mode !== 'create') return null;

		const dates = [state.startDateStr, state.endDateStr].sort() as [
			string,
			string,
		];
		if (dateStr < dates[0] || dateStr > dates[1]) return null;

		let minIdx: number;
		let maxIdx: number;

		if (dates[0] === dates[1]) {
			minIdx = Math.min(state.startIndex, state.endIndex);
			maxIdx = Math.max(state.startIndex, state.endIndex);
		} else if (dateStr === dates[0]) {
			const idx =
				state.startDateStr <= state.endDateStr
					? state.startIndex
					: state.endIndex;
			minIdx = idx;
			maxIdx = Infinity;
		} else if (dateStr === dates[1]) {
			const idx =
				state.startDateStr <= state.endDateStr
					? state.endIndex
					: state.startIndex;
			minIdx = 0;
			maxIdx = idx;
		} else {
			minIdx = 0;
			maxIdx = Infinity;
		}

		const totalCells =
			((config.hourEnd - config.hourStart) * 60) / config.cellDuration;
		maxIdx = Math.min(maxIdx, totalCells - 1);

		const startMins = config.hourStart * 60 + minIdx * config.cellDuration;
		let endMins =
			config.hourStart * 60 + (maxIdx + 1) * config.cellDuration;

		const isClick =
			state.startIndex === state.endIndex &&
			state.startDateStr === state.endDateStr;
		if (isClick) {
			endMins = startMins + config.clickSlotDuration;
		}

		const hourEndMins = config.hourEnd * 60;
		if (endMins > hourEndMins) endMins = hourEndMins;
		if (endMins <= startMins) return null;

		const top = minIdx * cellHeight;
		const height =
			((endMins - startMins) / config.cellDuration) * cellHeight;

		return {
			top,
			height,
			startTime: minutesToTime(startMins),
			endTime: minutesToTime(endMins),
		};
	};

	const getCellFromPoint = (
		x: number,
		y: number,
	): { dateStr: string; cellIndex: number } | null => {
		const elements = document.elementsFromPoint(x, y);
		for (const el of elements) {
			const htmlEl = el as HTMLElement;
			const dateStr = htmlEl.dataset.dateStr;
			const cellIndex = htmlEl.dataset.cellIndex;
			if (dateStr && cellIndex !== undefined) {
				return { dateStr, cellIndex: parseInt(cellIndex) };
			}
		}
		return null;
	};

	useEventListener(document, 'mouseup', endDrag);
	useEventListener(document, 'touchend', endDrag);
	useEventListener(document, 'mousemove', (e: MouseEvent) => {
		if (!dragState.value.isDragging) return;
		const cell = getCellFromPoint(e.clientX, e.clientY);
		if (cell) {
			updateDrag(cell.dateStr, cell.cellIndex);
		}
	});
	useEventListener(
		document,
		'touchmove',
		(e: TouchEvent) => {
			if (!dragState.value.isDragging) return;
			e.preventDefault();
			const touch = e.touches[0]!;
			const cell = getCellFromPoint(touch.clientX, touch.clientY);
			if (cell) {
				updateDrag(cell.dateStr, cell.cellIndex);
			}
		},
		{ passive: false },
	);

	return {
		dragState,
		scrollContainer,
		wasDragging,
		startCreate,
		startResize,
		updateDrag,
		endDrag,
		isDragHighlight,
		getDragPreview,
		getCellFromPoint,
	};
};

const timeToMinutes = (time: string): number => {
	const parts = time.split(':').map(Number);
	return parts[0]! * 60 + parts[1]!;
};
