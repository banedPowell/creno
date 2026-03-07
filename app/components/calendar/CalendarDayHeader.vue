<script setup lang="ts">
	import type { CalendarDayInfo } from '~/types/calendar';

	withDefaults(
		defineProps<{
			day: CalendarDayInfo;
			isLastColumn?: boolean;
		}>(),
		{ isLastColumn: false },
	);
</script>

<template>
	<div
		class="sticky top-0 z-20 flex h-9 items-center justify-center border-r border-b border-neutral-200 px-2 text-center text-xs font-medium md:h-7 dark:border-neutral-700"
		:class="[
			{ 'border-r-0': isLastColumn },
			day.isToday
				? 'text-primary-700 dark:text-primary-300 bg-neutral-200 dark:bg-neutral-800'
				: 'bg-old-neutral-50 dark:bg-old-neutral-900',
		]"
	>
		{{ day.label }}
	</div>
</template>
