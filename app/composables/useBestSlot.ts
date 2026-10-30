import { useWebHaptics } from 'web-haptics/vue';

// The "Meilleur créneau" control shared by the vote page and the admin page
export const useBestSlot = (
	calendar: Readonly<
		Ref<{
			bestSlots: { length: number };
			bestIndex: number;
			revealNextBest: () => void;
		} | null>
	>,
) => {
	const haptic = useWebHaptics();

	const hasBest = computed(() => (calendar.value?.bestSlots.length ?? 0) > 0);

	const bestLabel = computed(() => {
		const count = calendar.value?.bestSlots.length ?? 0;
		if (count <= 1) return 'Meilleur créneau';
		const index = Math.max(calendar.value?.bestIndex ?? -1, 0);
		return `Meilleur créneau ${index + 1}/${count}`;
	});

	const revealBest = () => {
		haptic.trigger('medium');
		calendar.value?.revealNextBest();
	};

	return {
		hasBest,
		bestLabel,
		revealBest,
		count: computed(() => calendar.value?.bestSlots.length ?? 0),
	};
};
