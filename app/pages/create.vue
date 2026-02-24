<script setup lang="ts">
	import type { TimeSlotData } from '~/components/CalendarSelector.vue';

	useHead({ title: 'Créer un sondage' });

	const step = ref(1);
	const title = ref('');
	const description = ref('');
	const slotDuration = ref(60);
	const customDuration = ref(45);
	const useCustomDuration = ref(false);
	const slots = ref<TimeSlotData[]>([]);
	const isSubmitting = ref(false);

	const shareDialogOpen = ref(false);
	const createdSlug = ref('');
	const createdAdminToken = ref('');

	const effectiveDuration = computed(() =>
		useCustomDuration.value ? customDuration.value : slotDuration.value,
	);

	const durationOptions = [
		{ label: '30 min', value: 30 },
		{ label: '1h', value: 60 },
		{ label: '1h30', value: 90 },
		{ label: '2h', value: 120 },
	];

	const canGoToStep2 = computed(() => title.value.trim().length > 0);
	const canGoToStep3 = computed(() => slots.value.length > 0);

	const sortedSlots = computed(() =>
		[...slots.value].sort((a, b) => {
			if (a.date !== b.date) return a.date.localeCompare(b.date);
			return a.startTime.localeCompare(b.startTime);
		}),
	);

	function formatSlotDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
		});
	}

	async function submit() {
		if (isSubmitting.value) return;
		isSubmitting.value = true;

		try {
			const result = await $fetch('/api/polls', {
				method: 'POST',
				body: {
					title: title.value,
					description: description.value || undefined,
					slotDuration: effectiveDuration.value,
					slots: slots.value,
				},
			});

			createdSlug.value = result.slug;
			createdAdminToken.value = result.adminToken;
			shareDialogOpen.value = true;
		} catch {
			useToast().add({
				title: 'Erreur lors de la création du sondage',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isSubmitting.value = false;
		}
	}
</script>

<template>
	<UContainer class="py-8">
		<div class="mx-auto max-w-4xl">
			<!-- Stepper header -->
			<div class="mb-8 flex items-center justify-center gap-2">
				<template v-for="s in 3" :key="s">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors"
						:class="
							step >= s
								? 'bg-primary-500 text-white'
								: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
						"
					>
						{{ s }}
					</div>
					<div
						v-if="s < 3"
						class="h-0.5 w-12 transition-colors"
						:class="
							step > s
								? 'bg-primary-500'
								: 'bg-neutral-200 dark:bg-neutral-700'
						"
					/>
				</template>
			</div>

			<!-- Step 1: Info -->
			<div v-if="step === 1" class="space-y-6">
				<div>
					<h1 class="text-2xl font-bold">Créer un sondage</h1>
					<p class="mt-1 text-neutral-500">
						Donnez un titre et une description à votre sondage.
					</p>
				</div>

				<UFormField label="Titre" required>
					<UInput
						v-model="title"
						placeholder="Ex: Réunion de bureau du mois de mars"
						size="lg"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Description">
					<UTextarea
						v-model="description"
						placeholder="Informations complémentaires (optionnel)"
						class="w-full"
						:rows="3"
					/>
				</UFormField>

				<div class="flex justify-end">
					<UButton
						size="lg"
						:disabled="!canGoToStep2"
						trailing-icon="i-lucide-arrow-right"
						@click="step = 2"
					>
						Suivant
					</UButton>
				</div>
			</div>

			<!-- Step 2: Calendar -->
			<div v-if="step === 2" class="space-y-6">
				<div>
					<h1 class="text-2xl font-bold">
						Sélectionnez les créneaux
					</h1>
					<p class="mt-1 text-neutral-500">
						Choisissez la durée puis cliquez et glissez sur le
						calendrier pour proposer des créneaux.
					</p>
				</div>

				<!-- Duration picker -->
				<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
					<label
						class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Durée des créneaux
					</label>
					<div class="flex flex-wrap items-center gap-2">
						<UButton
							v-for="opt in durationOptions"
							:key="opt.value"
							:variant="
								!useCustomDuration && slotDuration === opt.value
									? 'solid'
									: 'outline'
							"
							size="sm"
							@click="
								slotDuration = opt.value;
								useCustomDuration = false;
							"
						>
							{{ opt.label }}
						</UButton>
						<UButton
							:variant="useCustomDuration ? 'solid' : 'outline'"
							size="sm"
							@click="useCustomDuration = true"
						>
							Personnalisé
						</UButton>
					</div>
					<div
						v-if="useCustomDuration"
						class="mt-2 flex items-center gap-2"
					>
						<UInput
							v-model.number="customDuration"
							type="number"
							:min="15"
							:max="480"
							class="w-24"
							size="sm"
						/>
						<span class="text-sm text-neutral-500">minutes</span>
					</div>
				</div>

				<CalendarSelector
					v-model="slots"
					:slot-duration="effectiveDuration"
				/>

				<div v-if="slots.length > 0" class="space-y-2">
					<h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
						{{ slots.length }} créneau{{
							slots.length > 1 ? 'x' : ''
						}}
						sélectionné{{ slots.length > 1 ? 's' : '' }}
					</h3>
					<div class="flex flex-wrap gap-2">
						<UBadge
							v-for="(slot, idx) in sortedSlots"
							:key="idx"
							variant="subtle"
							size="md"
						>
							{{ formatSlotDate(slot.date) }} ·
							{{ slot.startTime }} – {{ slot.endTime }}
						</UBadge>
					</div>
				</div>

				<div class="flex justify-between">
					<UButton
						variant="ghost"
						size="lg"
						leading-icon="i-lucide-arrow-left"
						@click="step = 1"
					>
						Retour
					</UButton>
					<UButton
						size="lg"
						:disabled="!canGoToStep3"
						trailing-icon="i-lucide-arrow-right"
						@click="step = 3"
					>
						Suivant
					</UButton>
				</div>
			</div>

			<!-- Step 3: Confirm -->
			<div v-if="step === 3" class="space-y-6">
				<div>
					<h1 class="text-2xl font-bold">Récapitulatif</h1>
					<p class="mt-1 text-neutral-500">
						Vérifiez les informations avant de créer le sondage.
					</p>
				</div>

				<UCard>
					<div class="space-y-4">
						<div>
							<span
								class="text-sm font-medium text-neutral-500"
							>
								Titre
							</span>
							<p class="text-lg font-semibold">{{ title }}</p>
						</div>
						<div v-if="description">
							<span
								class="text-sm font-medium text-neutral-500"
							>
								Description
							</span>
							<p>{{ description }}</p>
						</div>
						<div>
							<span
								class="text-sm font-medium text-neutral-500"
							>
								Durée des créneaux
							</span>
							<p>{{ effectiveDuration }} minutes</p>
						</div>
						<USeparator />
						<div>
							<span
								class="text-sm font-medium text-neutral-500"
							>
								{{ sortedSlots.length }} créneau{{
									sortedSlots.length > 1 ? 'x' : ''
								}}
								proposé{{
									sortedSlots.length > 1 ? 's' : ''
								}}
							</span>
							<div class="mt-2 flex flex-wrap gap-2">
								<UBadge
									v-for="(slot, idx) in sortedSlots"
									:key="idx"
									variant="subtle"
									size="md"
								>
									{{ formatSlotDate(slot.date) }} ·
									{{ slot.startTime }} – {{ slot.endTime }}
								</UBadge>
							</div>
						</div>
					</div>
				</UCard>

				<div class="flex justify-between">
					<UButton
						variant="ghost"
						size="lg"
						leading-icon="i-lucide-arrow-left"
						@click="step = 2"
					>
						Retour
					</UButton>
					<UButton
						size="lg"
						:loading="isSubmitting"
						trailing-icon="i-lucide-check"
						@click="submit"
					>
						Créer le sondage
					</UButton>
				</div>
			</div>
		</div>

		<!-- Share dialog -->
		<ShareDialog
			v-model:open="shareDialogOpen"
			:slug="createdSlug"
			:admin-token="createdAdminToken"
		/>
	</UContainer>
</template>
