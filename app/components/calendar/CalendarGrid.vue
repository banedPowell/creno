<script setup lang="ts">
	withDefaults(
		defineProps<{
			maxHeight?: number;
		}>(),
		{ maxHeight: 80 },
	);

	const { grid, navigation, drag } = useCalendarContext();

	const gridRef = useTemplateRef<HTMLElement>('gridRef');

	useSwipe(gridRef, {
		threshold: 60,
		onSwipeEnd: (_e, direction) => {
			if (grid.isDesktop.value) return;
			if (navigation.view.value === 'week') return;
			if (direction === 'left') {
				navigation.nextPeriod();
			} else if (direction === 'right') {
				navigation.prevPeriod();
			}
		},
	});

	onMounted(() => {
		drag.scrollContainer.value = gridRef.value ?? null;
	});
</script>

<template>
	<div
		ref="gridRef"
		class="overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700"
		:style="{ maxHeight: `${maxHeight}dvh` }"
	>
		<div
			class="flex"
			:class="{
				'min-w-175': navigation.view.value === 'week',
			}"
		>
			<CalendarTimeColumn
				:time-labels="grid.timeLabels.value"
				:cell-height="grid.cellHeight.value"
				:cells-per-hour="grid.cellsPerHour.value"
			/>

			<CalendarDayColumn
				v-for="(day, index) in navigation.days.value"
				:key="day.dateStr"
				:day="day"
				:time-labels="grid.timeLabels.value"
				:cell-height="grid.cellHeight.value"
				:cells-per-hour="grid.cellsPerHour.value"
				:is-last-column="index === navigation.days.value.length - 1"
			/>
		</div>
	</div>
</template>
