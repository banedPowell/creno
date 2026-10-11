<script setup lang="ts">
	import {
		DEFAULT_POLL_OPTIONS,
		PASSWORD_MAX_LENGTH,
		PASSWORD_MIN_LENGTH,
		type PollOptions,
	} from '#shared/utils/pollSettings';

	const props = withDefaults(
		defineProps<{
			// The poll already has a password: an empty field then keeps it
			passwordSet?: boolean;
			defaultOpen?: boolean;
		}>(),
		{ passwordSet: false, defaultOpen: false },
	);

	const emit = defineEmits<{ removePassword: [] }>();

	const options = defineModel<PollOptions>({ required: true });
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

	const update = <K extends keyof PollOptions>(
		key: K,
		value: PollOptions[K],
	) => {
		options.value = { ...options.value, [key]: value };
	};

	const policies = [
		{
			value: 'token',
			label: 'Chacun sa réponse',
			hint: 'Seul l’appareil qui a répondu peut modifier la réponse.',
		},
		{
			value: 'open',
			label: 'Réponses ouvertes',
			hint: 'Tout le monde peut modifier toutes les réponses.',
		},
	];

	const changedCount = computed(
		() =>
			Number(
				options.value.votePolicy !== DEFAULT_POLL_OPTIONS.votePolicy,
			) +
			Number(options.value.hideResults) +
			Number(!!options.value.password || props.passwordSet),
	);

	const showPassword = ref(false);
</script>

<template>
	<UCollapsible :default-open="defaultOpen" class="flex flex-col gap-3">
		<UButton
			color="neutral"
			variant="ghost"
			icon="i-lucide-settings-2"
			trailing-icon="i-lucide-chevron-down"
			class="group w-fit"
			:ui="{
				trailingIcon:
					'transition-transform group-data-[state=open]:rotate-180',
			}"
			data-advanced-toggle
		>
			<template #default>
				Options avancées
				<UBadge
					v-if="changedCount"
					:label="String(changedCount)"
					color="neutral"
					variant="soft"
					size="sm"
				/>
			</template>
		</UButton>

		<template #content>
			<div
				class="bg-elevated grid gap-5 rounded-xl p-4 md:grid-cols-3"
				data-advanced-options
			>
				<UFormField label="Modification des réponses" name="votePolicy">
					<URadioGroup
						:model-value="options.votePolicy"
						:items="policies"
						color="neutral"
						data-option-policy
						:ui="{
							item: 'hover:bg-accented -mx-1.5 cursor-pointer rounded-lg px-1.5 py-1 transition-colors select-none',
							label: 'cursor-pointer',
						}"
						@update:model-value="
							update(
								'votePolicy',
								$event as PollOptions['votePolicy'],
							)
						"
					>
						<template #label="{ item }">
							<span class="block font-medium">{{
								item.label
							}}</span>
							<span class="text-muted block font-normal">
								{{ item.hint }}
							</span>
						</template>
					</URadioGroup>
				</UFormField>

				<UFormField label="Réponses des autres" name="hideResults">
					<USwitch
						:model-value="options.hideResults"
						data-option-hide-results
						:ui="{
							root: 'hover:bg-accented -mx-1.5 cursor-pointer rounded-lg px-1.5 py-1 transition-colors select-none',
							label: 'cursor-pointer',
						}"
						@update:model-value="update('hideResults', $event)"
					>
						<template #label>
							<span class="block font-medium">
								Masquer tant qu’on n’a pas répondu
							</span>
							<span class="text-muted block font-normal">
								Chacun répond sans être influencé. Vous les
								voyez toujours.
							</span>
						</template>
					</USwitch>
				</UFormField>

				<UFormField
					label="Mot de protection"
					name="password"
					:hint="passwordSet ? 'Actif' : undefined"
					:description="
						passwordSet
							? 'Laissez vide pour garder le mot actuel.'
							: 'Facultatif, demandé avant d’ouvrir le Creno.'
					"
				>
					<div class="flex flex-col gap-2">
						<UInput
							:model-value="options.password"
							:type="showPassword ? 'text' : 'password'"
							:placeholder="passwordSet ? 'Nouveau mot' : 'Aucun'"
							:minlength="PASSWORD_MIN_LENGTH"
							:maxlength="PASSWORD_MAX_LENGTH"
							autocomplete="new-password"
							aria-label="Mot de protection"
							class="w-full"
							data-option-password
							@update:model-value="
								update('password', String($event))
							"
						>
							<template #trailing>
								<UButton
									color="neutral"
									variant="link"
									size="sm"
									:icon="
										showPassword
											? 'i-lucide-eye-off'
											: 'i-lucide-eye'
									"
									:aria-label="
										showPassword
											? 'Masquer le mot'
											: 'Afficher le mot'
									"
									@click="showPassword = !showPassword"
								/>
							</template>
						</UInput>
						<UButton
							v-if="passwordSet"
							label="Retirer la protection"
							color="error"
							variant="link"
							size="sm"
							class="w-fit px-0"
							data-remove-password
							@click="emit('removePassword')"
						/>
					</div>
				</UFormField>

				<UFormField
					label="Précision de la grille"
					name="snapMinutes"
					description="Finesse du survol, du tracé et du redimensionnement."
				>
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

				<UFormField
					label="Longueur par défaut"
					name="clickSlotDuration"
					description="Ce qu’un simple clic pose sur le calendrier."
				>
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
	</UCollapsible>
</template>
