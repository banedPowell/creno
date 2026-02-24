<script setup lang="ts">
	interface TimeSlot {
		id: string;
		date: string;
		startTime: string;
		endTime: string;
	}

	interface Response {
		participantId: string;
		timeSlotId: string;
		availability: 'yes' | 'maybe' | 'no';
	}

	const props = defineProps<{
		slots: TimeSlot[];
		responses: Response[];
		participantCount: number;
	}>();

	const bestSlot = computed(() => {
		if (props.participantCount === 0 || props.slots.length === 0)
			return null;

		let bestId: string | null = null;
		let bestScore = -1;

		for (const slot of props.slots) {
			let score = 0;
			for (const resp of props.responses) {
				if (resp.timeSlotId !== slot.id) continue;
				if (resp.availability === 'yes') score += 2;
				else if (resp.availability === 'maybe') score += 1;
			}
			if (score > bestScore) {
				bestScore = score;
				bestId = slot.id;
			}
		}

		if (bestScore <= 0) return null;

		const slot = props.slots.find((s) => s.id === bestId);
		if (!slot) return null;

		const yesCount = props.responses.filter(
			(r) => r.timeSlotId === bestId && r.availability === 'yes',
		).length;

		const d = new Date(slot.date + 'T00:00:00');
		return {
			label: d.toLocaleDateString('fr-FR', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
			}),
			time: `${slot.startTime} – ${slot.endTime}`,
			yesCount,
			total: props.participantCount,
		};
	});
</script>

<template>
	<UAlert
		v-if="bestSlot"
		icon="i-lucide-trophy"
		color="success"
		variant="subtle"
		:title="`Meilleur créneau : ${bestSlot.label}, ${bestSlot.time}`"
		:description="`${bestSlot.yesCount} participant${bestSlot.yesCount > 1 ? 's' : ''} sur ${bestSlot.total} disponible${bestSlot.yesCount > 1 ? 's' : ''}`"
	/>
</template>
