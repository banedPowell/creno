<script setup lang="ts">
	import type { CalendarTimeLabel } from '~/types/calendar';

	defineProps<{
		timeLabels: CalendarTimeLabel[];
		cellHeight: number;
		cellsPerHour: number;
	}>();
</script>

<template>
	<div
		class="dark:bg-old-neutral-900 sticky left-0 z-30 w-[60px] shrink-0 bg-neutral-50 backdrop-blur-3xl"
	>
		<!-- Corner cell -->
		<div
			class="sticky top-0 z-30 h-9 border-r border-b border-neutral-200 bg-neutral-100 md:h-7 dark:border-neutral-700 dark:bg-neutral-700"
		/>

		<!-- Time labels -->
		<div
			v-for="(timeLabel, rowIndex) in timeLabels"
			:key="timeLabel.time"
			class="min-h-8 border-r border-neutral-200 px-1 text-right text-[10px] leading-none text-neutral-400 dark:border-neutral-700"
			:style="{ height: `${cellHeight}px`, paddingTop: '2px' }"
			:class="{
				'border-t border-t-neutral-200 dark:border-t-neutral-700':
					rowIndex > 0 && rowIndex % cellsPerHour === 0,
				'border-t border-t-neutral-100 dark:border-t-neutral-800/80':
					rowIndex > 0 && rowIndex % cellsPerHour !== 0,
			}"
		>
			<span v-if="rowIndex % cellsPerHour === 0">
				{{ timeLabel.label }}
			</span>
		</div>
	</div>
</template>
