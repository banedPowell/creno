<script setup lang="ts">
	import type { CalendarTimeSlot, CalendarView } from '~/types/calendar';

	const props = withDefaults(
		defineProps<{
			hourStart?: number;
			hourEnd?: number;
			snapMinutes?: number;
			clickSlotDuration?: number;
			defaultView?: CalendarView;
			maxHeight?: number;
		}>(),
		{
			hourStart: 7,
			hourEnd: 22,
			snapMinutes: 15,
			clickSlotDuration: 120,
			defaultView: 'week',
			maxHeight: 80,
		},
	);

	const slots = defineModel<CalendarTimeSlot[]>({ required: true });

	const { calendar } = useProvideCalendarContext(
		slots,
		{
			hourStart: props.hourStart,
			hourEnd: props.hourEnd,
			snapMinutes: props.snapMinutes,
			clickSlotDuration: props.clickSlotDuration,
		},
		props.defaultView,
	);

	defineShortcuts({
		t: calendar.goToday,
		d: () => (calendar.view.value = 'day'),
		w: () => (calendar.view.value = 'week'),
		m: () => (calendar.view.value = 'month'),
		arrowleft: calendar.prevPeriod,
		arrowright: calendar.nextPeriod,
		shift_arrowleft: calendar.prevBigPeriod,
		shift_arrowright: calendar.nextBigPeriod,
	});
</script>

<template>
	<div class="select-none">
		<CalendarHeader />
		<CalendarMonthView v-if="calendar.view.value === 'month'" />
		<CalendarWeekView v-else :max-height="maxHeight" />
	</div>
</template>
