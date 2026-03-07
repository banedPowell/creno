<script setup lang="ts">
	import type { CalendarTimeSlot, CalendarView } from '~/types/calendar';

	const props = withDefaults(
		defineProps<{
			modelValue: CalendarTimeSlot[];
			hourStart?: number;
			hourEnd?: number;
			cellDuration?: number;
			dragStep?: number;
			clickSlotDuration?: number;
			defaultView?: CalendarView;
			maxHeight?: number;
		}>(),
		{
			hourStart: 7,
			hourEnd: 22,
			cellDuration: 30,
			dragStep: undefined,
			clickSlotDuration: 120,
			defaultView: 'week',
			maxHeight: 80,
		},
	);

	const emit = defineEmits<{
		'update:modelValue': [value: CalendarTimeSlot[]];
	}>();

	const slots = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	});

	useProvideCalendarContext(
		slots,
		{
			hourStart: props.hourStart,
			hourEnd: props.hourEnd,
			cellDuration: props.cellDuration,
			dragStep: props.dragStep ?? props.cellDuration,
			clickSlotDuration: props.clickSlotDuration,
		},
		props.defaultView,
	);
</script>

<template>
	<div class="select-none">
		<CalendarHeader />
		<CalendarGrid :max-height="props.maxHeight" />
	</div>
</template>
