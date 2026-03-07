<script setup lang="ts">
	import type { CalendarSlotPosition } from '~/types/calendar';

	const props = defineProps<{
		position: CalendarSlotPosition;
		color?: string;
	}>();

	const emit = defineEmits<{
		remove: [id: string];
		resizeStart: [id: string, edge: 'top' | 'bottom'];
	}>();

	const { grid, drag } = useCalendarContext();

	const handleSize = computed(() => (grid.isDesktop.value ? '6px' : '12px'));

	const onSlotClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (drag.wasDragging.value) return;
		emit('remove', props.position.slot.id);
	};

	const onResizeStart = (
		edge: 'top' | 'bottom',
		e: MouseEvent | TouchEvent,
	) => {
		e.stopPropagation();
		e.preventDefault();
		emit('resizeStart', props.position.slot.id, edge);
	};
</script>

<template>
	<div
		class="dark:bg-old-neutral-800 dark:hover:bg-old-neutral-700/70 absolute right-0.5 left-0.5 z-10 cursor-pointer overflow-hidden border border-neutral-300 bg-neutral-100 text-neutral-900 shadow-md transition-colors hover:bg-neutral-400/40 dark:border-neutral-600/50 dark:text-neutral-400 dark:shadow-lg dark:shadow-neutral-600/30"
		:class="{
			'rounded-t': position.isStart,
			'rounded-b': position.isEnd,
		}"
		:style="{
			top: `${position.top}px`,
			height: `${position.height}px`,
		}"
		@click="onSlotClick"
		@mousedown.stop
		@touchstart.stop
	>
		<!-- Top resize handle -->
		<div
			v-if="position.isStart"
			class="absolute top-0 right-0 left-0 cursor-ns-resize"
			:style="{ height: handleSize }"
			@mousedown="onResizeStart('top', $event)"
			@touchstart="onResizeStart('top', $event)"
		/>

		<!-- Content -->
		<p
			v-if="position.height > 16"
			class="truncate px-1 py-0.5 text-[10px] leading-tight font-medium"
		>
			{{ position.slot.startTime }} – {{ position.slot.endTime }}
		</p>

		<!-- Bottom resize handle -->
		<div
			v-if="position.isEnd"
			class="absolute right-0 bottom-0 left-0 cursor-ns-resize"
			:style="{ height: handleSize }"
			@mousedown="onResizeStart('bottom', $event)"
			@touchstart="onResizeStart('bottom', $event)"
		/>
	</div>
</template>
