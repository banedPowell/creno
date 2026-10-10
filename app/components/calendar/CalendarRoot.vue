<script setup lang="ts">
	import type {
		CalendarTimeSlot,
		CalendarView,
		CalendarVoteState,
	} from '~/types/calendar';

	const props = withDefaults(
		defineProps<{
			hourStart?: number;
			hourEnd?: number;
			snapMinutes?: number;
			clickSlotDuration?: number;
			defaultView?: CalendarView;
			maxHeight?: number;
			initialDate?: Date;
			minDate?: Date;
			// Given, the calendar answers the slots instead of editing them
			vote?: CalendarVoteState;
		}>(),
		{
			hourStart: 7,
			hourEnd: 22,
			snapMinutes: 15,
			clickSlotDuration: 120,
			defaultView: 'week',
			maxHeight: 80,
			initialDate: undefined,
			minDate: undefined,
			vote: undefined,
		},
	);

	const slots = defineModel<CalendarTimeSlot[]>({ required: true });

	const { calendar, revealNextBest, bestSlots, bestIndex } =
		useProvideCalendarContext(
			slots,
			{
				hourStart: props.hourStart,
				hourEnd: props.hourEnd,
				snapMinutes: props.snapMinutes,
				clickSlotDuration: props.clickSlotDuration,
			},
			props.defaultView,
			{
				initialDate: props.initialDate,
				minDate: props.minDate,
				vote: props.vote,
			},
		);

	defineShortcuts({
		t: calendar.goToday,
		d: () => (calendar.view.value = 'day'),
		w: () => (calendar.view.value = 'week'),
		m: () => (calendar.view.value = 'month'),
		b: revealNextBest,
		arrowleft: calendar.prevPeriod,
		arrowright: calendar.nextPeriod,
		shift_arrowleft: calendar.prevBigPeriod,
		shift_arrowright: calendar.nextBigPeriod,
	});

	// The poll page draws the button outside this component, where the
	// calendar context is not visible
	defineExpose({ bestSlots, bestIndex, revealNextBest });
</script>

<template>
	<div class="select-none">
		<CalendarHeader />
		<CalendarMonthView v-if="calendar.view.value === 'month'" />
		<CalendarWeekView v-else :max-height="maxHeight" />
	</div>
</template>
