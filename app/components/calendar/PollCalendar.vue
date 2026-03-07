<script setup lang="ts">
	import type { CalendarTimeSlot } from '~/types/calendar';

	const props = defineProps<{
		modelValue: CalendarTimeSlot[];
	}>();

	const emit = defineEmits<{
		'update:modelValue': [value: CalendarTimeSlot[]];
	}>();

	const slots = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	});
</script>

<template>
	<CalendarRoot
		v-model="slots"
		:hour-start="0"
		:hour-end="24"
		:click-slot-duration="120"
	/>
</template>
