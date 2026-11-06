<script setup lang="ts">
	import type { CalendarTimeSlot, CalendarVoteState } from '~/types/calendar';

	withDefaults(
		defineProps<{
			vote?: CalendarVoteState;
			initialDate?: Date;
			minDate?: Date;
			snapMinutes?: number;
			clickSlotDuration?: number;
		}>(),
		{ snapMinutes: 30, clickSlotDuration: 120 },
	);

	const slots = defineModel<CalendarTimeSlot[]>({ required: true });

	const calendar = useTemplateRef<{
		bestSlots: { length: number };
		bestIndex: number;
		revealNextBest: () => void;
	}>('calendar');

	defineExpose({
		bestSlots: computed(() => calendar.value?.bestSlots ?? []),
		bestIndex: computed(() => calendar.value?.bestIndex ?? -1),
		revealNextBest: () => calendar.value?.revealNextBest(),
	});
</script>

<template>
	<CalendarRoot
		ref="calendar"
		v-model="slots"
		:hour-start="0"
		:hour-end="24"
		:snap-minutes="snapMinutes"
		:click-slot-duration="clickSlotDuration"
		:initial-date="initialDate"
		:min-date="minDate"
		:vote="vote"
	/>
</template>
