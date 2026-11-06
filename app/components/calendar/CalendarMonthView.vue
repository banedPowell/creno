<script setup lang="ts">
	const { calendar } = useCalendarContext();

	const weekdays = computed(() =>
		eachDay(calendar.monthWeeks.value[0]!, 7).map(formatWeekday),
	);
</script>

<template>
	<div class="border-default overflow-hidden rounded-lg border">
		<div class="border-default bg-muted/50 grid grid-cols-7 border-b">
			<span
				v-for="weekday in weekdays"
				:key="weekday"
				class="text-muted py-2 text-center text-xs capitalize"
			>
				{{ weekday }}
			</span>
		</div>

		<CalendarMonthWeek
			v-for="(weekStart, index) in calendar.monthWeeks.value"
			:key="weekStart.getTime()"
			:week-start="weekStart"
			:month="calendar.currentDate.value.getMonth()"
			:class="
				index === calendar.monthWeeks.value.length - 1 && 'border-b-0'
			"
		/>
	</div>
</template>
