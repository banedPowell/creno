<script setup lang="ts">
	import type { CalendarTimeSlot } from '~/types/calendar';

	const slots = defineModel<CalendarTimeSlot[]>({ required: true });
</script>

<template>
	<CalendarRoot
		v-model="slots"
		:hour-start="0"
		:hour-end="24"
		:click-slot-duration="120"
	/>
</template>
