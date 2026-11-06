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
			// Create shows these beside the calendar, not inside this block
			showGrid?: boolean;
		}>(),
		{ passwordSet: false, defaultOpen: false, showGrid: true },
	);

	const emit = defineEmits<{ removePassword: [] }>();

	const options = defineModel<PollOptions>({ required: true });
	const snapMinutes = defineModel<number>('snapMinutes', { default: 30 });
	const clickSlotDuration = defineModel<number>('clickSlotDuration', {
		default: 120,
	});

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
				class="bg-elevated flex flex-col gap-5 rounded-xl p-4"
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

				<PollGridSettings
					v-if="showGrid"
					v-model:snap-minutes="snapMinutes"
					v-model:click-slot-duration="clickSlotDuration"
					class="contents"
				/>
			</div>
		</template>
	</UCollapsible>
</template>
