<script setup lang="ts">
	const snapMinutes = defineModel<number>('snapMinutes', { default: 30 });
	const clickSlotDuration = defineModel<number>('clickSlotDuration', {
		default: 120,
	});

	const SNAP_PRESETS = [15, 30, 60];
	const CLICK_PRESETS = [60, 120, 180];
	const SNAP_MIN = 5;
	const CLICK_MIN = 15;

	const choice = (presets: number[], minutes: number) =>
		presets.includes(minutes) ? String(minutes) : 'custom';

	// Stays on Personnalisé even when the typed number matches a preset
	const snapChoice = ref(choice(SNAP_PRESETS, snapMinutes.value));
	const clickChoice = ref(choice(CLICK_PRESETS, clickSlotDuration.value));

	const onSnapChoice = (value: string) => {
		snapChoice.value = value;
		if (value !== 'custom') snapMinutes.value = Number(value);
	};

	const onClickChoice = (value: string) => {
		clickChoice.value = value;
		if (value !== 'custom') clickSlotDuration.value = Number(value);
	};

	const clickFloor = computed(() => Math.max(CLICK_MIN, snapMinutes.value));

	watch(snapMinutes, (snap) => {
		const floor = Math.max(CLICK_MIN, snap);
		if (clickSlotDuration.value >= floor) return;
		clickSlotDuration.value = floor;
		if (clickChoice.value !== 'custom')
			clickChoice.value = choice(CLICK_PRESETS, floor);
	});

	const snapItems = [
		{ value: '15', label: '15 min' },
		{ value: '30', label: '30 min' },
		{ value: '60', label: '1 h' },
		{ value: 'custom', label: 'Personnalisé' },
	];

	const clickItems = [
		{ value: '60', label: '1 h' },
		{ value: '120', label: '2 h' },
		{ value: '180', label: '3 h' },
		{ value: 'custom', label: 'Personnalisé' },
	];

	const hintUi = {
		content: 'h-auto max-w-56 items-start py-1.5',
		text: 'overflow-visible whitespace-normal text-clip',
	};
</script>

<template>
	<div class="flex flex-col gap-5">
		<UFormField name="snapMinutes">
			<template #label>
				<span class="inline-flex items-center gap-1">
					Précision de la grille
					<UTooltip
						text="Finesse du survol, du tracé et du redimensionnement."
						:ui="hintUi"
					>
						<button
							type="button"
							class="text-muted hover:text-default"
							aria-label="Aide sur la précision de la grille"
							@click.prevent
						>
							<UIcon
								name="i-lucide-circle-help"
								class="size-3.5"
							/>
						</button>
					</UTooltip>
				</span>
			</template>
			<div class="flex flex-col gap-2">
				<USelect
					:model-value="snapChoice"
					:items="snapItems"
					class="w-full"
					data-option-snap
					@update:model-value="onSnapChoice(String($event))"
				/>
				<UInputNumber
					v-if="snapChoice === 'custom'"
					v-model="snapMinutes"
					:min="SNAP_MIN"
					:step="5"
					aria-label="Pas personnalisé, en minutes"
					data-option-snap-custom
				/>
			</div>
		</UFormField>

		<UFormField name="clickSlotDuration">
			<template #label>
				<span class="inline-flex items-center gap-1">
					Longueur par défaut
					<UTooltip
						text="Ce qu’un simple clic pose sur le calendrier."
						:ui="hintUi"
					>
						<button
							type="button"
							class="text-muted hover:text-default"
							aria-label="Aide sur la longueur par défaut"
							@click.prevent
						>
							<UIcon
								name="i-lucide-circle-help"
								class="size-3.5"
							/>
						</button>
					</UTooltip>
				</span>
			</template>
			<div class="flex flex-col gap-2">
				<USelect
					:model-value="clickChoice"
					:items="clickItems"
					class="w-full"
					data-option-click
					@update:model-value="onClickChoice(String($event))"
				/>
				<UInputNumber
					v-if="clickChoice === 'custom'"
					v-model="clickSlotDuration"
					:min="clickFloor"
					:step="5"
					aria-label="Durée personnalisée, en minutes"
					data-option-click-custom
				/>
			</div>
		</UFormField>
	</div>
</template>
