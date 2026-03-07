<script setup lang="ts">
	import type { CalendarDayInfo, CalendarTimeLabel } from '~/types/calendar';

	const props = withDefaults(
		defineProps<{
			day: CalendarDayInfo;
			timeLabels: CalendarTimeLabel[];
			cellHeight: number;
			cellsPerHour: number;
			isLastColumn?: boolean;
		}>(),
		{ isLastColumn: false },
	);

	const { slotActions, drag, config, grid } = useCalendarContext();

	const daySlots = computed(() =>
		slotActions.getSlotsForDay(props.day.dateStr, props.cellHeight),
	);

	const onCellMouseDown = (e: MouseEvent, cellIndex: number) => {
		if (!grid.isDesktop.value) return;
		e.preventDefault();
		drag.startCreate(props.day.dateStr, cellIndex);
	};

	const onCellMouseEnter = (cellIndex: number) => {
		drag.updateDrag(props.day.dateStr, cellIndex);
	};

	const longPressTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
	const longPressTouchStart = ref<{ x: number; y: number } | null>(null);
	const LONG_PRESS_DELAY = 350;
	const LONG_PRESS_DISTANCE = 12;

	const clearLongPress = () => {
		if (longPressTimeout.value) {
			clearTimeout(longPressTimeout.value);
			longPressTimeout.value = null;
		}
		longPressTouchStart.value = null;
	};

	const onCellTouchStart = (e: TouchEvent, cellIndex: number) => {
		if (grid.isDesktop.value) return;
		clearLongPress();
		const touch = e.touches[0];
		if (!touch) return;
		longPressTouchStart.value = { x: touch.clientX, y: touch.clientY };
		longPressTimeout.value = setTimeout(() => {
			longPressTimeout.value = null;
			longPressTouchStart.value = null;
			drag.startCreate(props.day.dateStr, cellIndex);
		}, LONG_PRESS_DELAY);
	};

	const onCellTouchMove = (e: TouchEvent) => {
		const start = longPressTouchStart.value;
		if (!start) return;
		const touch = e.touches[0];
		if (!touch) return;
		const dx = touch.clientX - start.x;
		const dy = touch.clientY - start.y;
		if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_DISTANCE) {
			clearLongPress();
		}
	};

	const onCellTouchEnd = () => {
		clearLongPress();
	};

	tryOnScopeDispose(clearLongPress);

	const slotTimeToCellIndex = (time: string): number => {
		const parts = time.split(':').map(Number);
		const mins = parts[0]! * 60 + parts[1]!;
		return Math.floor((mins - config.hourStart * 60) / config.cellDuration);
	};

	const dragPreview = computed(() =>
		drag.getDragPreview(props.day.dateStr, props.cellHeight),
	);

	const onResizeStart = (slotId: string, edge: 'top' | 'bottom') => {
		const found = daySlots.value.find((p) => p.slot.id === slotId);
		if (!found) return;

		const cellIndex =
			edge === 'top'
				? slotTimeToCellIndex(found.slot.startTime)
				: slotTimeToCellIndex(found.slot.endTime) - 1;

		drag.startResize(
			slotId,
			edge,
			props.day.dateStr,
			Math.max(0, cellIndex),
		);
	};
</script>

<template>
	<div class="min-w-28 flex-1">
		<!-- Day header -->
		<CalendarDayHeader :day="day" :is-last-column="isLastColumn" />

		<!-- Cells + Slots -->
		<div
			class="relative"
			@touchmove="onCellTouchMove"
			@touchend="onCellTouchEnd"
		>
			<div
				v-for="(timeLabel, rowIndex) in timeLabels"
				:key="timeLabel.time"
				class="min-h-8 cursor-crosshair border-r border-neutral-100 dark:border-neutral-800"
				:class="{
					'border-r-0': isLastColumn,
					'border-t border-t-neutral-200 dark:border-t-neutral-700':
						rowIndex > 0 && rowIndex % cellsPerHour === 0,
					'border-t border-t-neutral-100 dark:border-t-neutral-800/80':
						rowIndex > 0 && rowIndex % cellsPerHour !== 0,
				}"
				:style="{ height: `${cellHeight}px` }"
				:data-date-str="day.dateStr"
				:data-cell-index="rowIndex"
				@mousedown="onCellMouseDown($event, rowIndex)"
				@mouseenter="onCellMouseEnter(rowIndex)"
				@touchstart="onCellTouchStart($event, rowIndex)"
			/>

			<!-- Drag-to-create preview -->
			<div
				v-if="dragPreview"
				class="bg-secondary-500/30 border-secondary-500/50 pointer-events-none absolute right-0.5 left-0.5 z-10 rounded border"
				:style="{
					top: `${dragPreview.top}px`,
					height: `${dragPreview.height}px`,
				}"
			>
				<div
					v-if="dragPreview.height > 16"
					class="text-secondary-700 dark:text-secondary-300 truncate px-1 py-0.5 text-[10px] leading-tight font-medium"
				>
					{{ dragPreview.startTime }} – {{ dragPreview.endTime }}
				</div>
			</div>

			<!-- Slot overlays -->
			<CalendarSlot
				v-for="pos in daySlots"
				:key="pos.slot.id"
				:position="pos"
				@remove="slotActions.removeSlot"
				@resize-start="onResizeStart"
			/>
		</div>
	</div>
</template>
