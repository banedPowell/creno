<script setup lang="ts">
	import type { TimeSlotData } from '~/components/CalendarSelector.vue';

	const route = useRoute();
	const slug = route.params.slug as string;
	const token = route.params.token as string;
	const toast = useToast();

	useHead({ title: 'Administration du sondage' });

	const { data, refresh, status } = await useFetch(`/api/polls/${slug}`);

	const isEditingInfo = ref(false);
	const editTitle = ref('');
	const editDescription = ref('');

	const isEditingSlots = ref(false);
	const editSlots = ref<TimeSlotData[]>([]);
	const editSlotDuration = ref(60);

	const showDeleteConfirm = ref(false);
	const isDeleting = ref(false);
	const isSaving = ref(false);

	watch(
		data,
		(val) => {
			if (val) {
				editTitle.value = val.poll.title;
				editDescription.value = val.poll.description || '';
				editSlotDuration.value = val.poll.slotDuration;
			}
		},
		{ immediate: true },
	);

	function startEditingInfo() {
		if (!data.value) return;
		editTitle.value = data.value.poll.title;
		editDescription.value = data.value.poll.description || '';
		isEditingInfo.value = true;
	}

	function startEditingSlots() {
		if (!data.value) return;
		editSlots.value = data.value.slots.map((s) => ({
			date: s.date,
			startTime: s.startTime,
			endTime: s.endTime,
		}));
		editSlotDuration.value = data.value.poll.slotDuration;
		isEditingSlots.value = true;
	}

	async function saveInfo() {
		isSaving.value = true;
		try {
			await $fetch(`/api/polls/${slug}/admin/${token}`, {
				method: 'PUT',
				body: {
					title: editTitle.value,
					description: editDescription.value || null,
				},
			});
			toast.add({
				title: 'Informations mises à jour',
				icon: 'i-lucide-check',
				color: 'success',
			});
			isEditingInfo.value = false;
			await refresh();
		} catch {
			toast.add({
				title: 'Erreur',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isSaving.value = false;
		}
	}

	async function saveSlots() {
		isSaving.value = true;
		try {
			await $fetch(`/api/polls/${slug}/admin/${token}`, {
				method: 'PUT',
				body: { slots: editSlots.value },
			});
			toast.add({
				title: 'Créneaux mis à jour',
				icon: 'i-lucide-check',
				color: 'success',
			});
			isEditingSlots.value = false;
			await refresh();
		} catch {
			toast.add({
				title: 'Erreur',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isSaving.value = false;
		}
	}

	async function toggleClosed() {
		isSaving.value = true;
		try {
			await $fetch(`/api/polls/${slug}/admin/${token}`, {
				method: 'PUT',
				body: {
					closedAt: data.value?.poll.closedAt
						? null
						: new Date().toISOString(),
				},
			});
			toast.add({
				title: data.value?.poll.closedAt
					? 'Sondage rouvert'
					: 'Sondage fermé',
				icon: 'i-lucide-check',
				color: 'success',
			});
			await refresh();
		} catch {
			toast.add({
				title: 'Erreur',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isSaving.value = false;
		}
	}

	async function deletePoll() {
		isDeleting.value = true;
		try {
			await $fetch(`/api/polls/${slug}/admin/${token}`, {
				method: 'DELETE',
			});
			toast.add({
				title: 'Sondage supprimé',
				icon: 'i-lucide-check',
				color: 'success',
			});
			await navigateTo('/');
		} catch {
			toast.add({
				title: 'Erreur lors de la suppression',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isDeleting.value = false;
		}
	}

	function formatSlotDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
		});
	}
</script>

<template>
	<UContainer class="py-8">
		<div class="mx-auto max-w-5xl">
			<!-- Loading -->
			<div
				v-if="status === 'pending'"
				class="flex items-center justify-center py-20"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="text-primary-500 h-8 w-8 animate-spin"
				/>
			</div>

			<!-- Error -->
			<div v-else-if="!data" class="py-20 text-center">
				<UIcon
					name="i-lucide-shield-x"
					class="mx-auto mb-4 h-12 w-12 text-neutral-300"
				/>
				<h2 class="text-xl font-semibold">Accès refusé</h2>
				<p class="mt-1 text-neutral-500">
					Ce lien d'administration est invalide.
				</p>
				<UButton class="mt-4" variant="soft" to="/">
					Retour à l'accueil
				</UButton>
			</div>

			<!-- Admin content -->
			<template v-else>
				<div class="mb-6 flex items-center gap-3">
					<UBadge color="warning" variant="subtle" size="lg">
						<UIcon name="i-lucide-shield" class="mr-1 h-4 w-4" />
						Administration
					</UBadge>
					<UButton
						variant="soft"
						size="sm"
						:to="`/poll/${slug}`"
						leading-icon="i-lucide-external-link"
					>
						Voir le sondage
					</UButton>
				</div>

				<!-- Poll info section -->
				<UCard class="mb-6">
					<template #header>
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Informations</h2>
							<UButton
								v-if="!isEditingInfo"
								icon="i-lucide-pencil"
								variant="ghost"
								size="sm"
								@click="startEditingInfo"
							/>
						</div>
					</template>

					<div v-if="!isEditingInfo" class="space-y-2">
						<div>
							<span
								class="text-sm font-medium text-neutral-500"
							>
								Titre
							</span>
							<p class="font-semibold">
								{{ data.poll.title }}
							</p>
						</div>
						<div v-if="data.poll.description">
							<span
								class="text-sm font-medium text-neutral-500"
							>
								Description
							</span>
							<p>{{ data.poll.description }}</p>
						</div>
					</div>

					<div v-else class="space-y-4">
						<UFormField label="Titre">
							<UInput v-model="editTitle" class="w-full" />
						</UFormField>
						<UFormField label="Description">
							<UTextarea
								v-model="editDescription"
								class="w-full"
								:rows="2"
							/>
						</UFormField>
						<div class="flex justify-end gap-2">
							<UButton
								variant="ghost"
								@click="isEditingInfo = false"
							>
								Annuler
							</UButton>
							<UButton :loading="isSaving" @click="saveInfo">
								Enregistrer
							</UButton>
						</div>
					</div>
				</UCard>

				<!-- Slots section -->
				<UCard class="mb-6">
					<template #header>
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">Créneaux</h2>
							<UButton
								v-if="!isEditingSlots"
								icon="i-lucide-pencil"
								variant="ghost"
								size="sm"
								@click="startEditingSlots"
							/>
						</div>
					</template>

					<div v-if="!isEditingSlots">
						<div class="flex flex-wrap gap-2">
							<UBadge
								v-for="slot in data.slots"
								:key="slot.id"
								variant="subtle"
								size="md"
							>
								{{ formatSlotDate(slot.date) }} ·
								{{ slot.startTime }} – {{ slot.endTime }}
							</UBadge>
						</div>
					</div>

					<div v-else class="space-y-4">
						<CalendarSelector
							v-model="editSlots"
							:slot-duration="editSlotDuration"
						/>
						<div class="flex justify-end gap-2">
							<UButton
								variant="ghost"
								@click="isEditingSlots = false"
							>
								Annuler
							</UButton>
							<UButton :loading="isSaving" @click="saveSlots">
								Enregistrer les créneaux
							</UButton>
						</div>
					</div>
				</UCard>

				<!-- Responses preview -->
				<UCard class="mb-6">
					<template #header>
						<h2 class="text-lg font-semibold">Réponses</h2>
					</template>

					<BestSlotBanner
						:slots="data.slots"
						:responses="data.responses"
						:participant-count="data.participants.length"
						class="mb-4"
					/>

					<CalendarResponse
						:model-value="{}"
						:slots="data.slots"
						:participants="data.participants"
						:responses="data.responses"
						readonly
					/>
				</UCard>

				<!-- Danger zone -->
				<UCard>
					<template #header>
						<h2 class="text-lg font-semibold text-red-600">
							Zone de danger
						</h2>
					</template>

					<div class="space-y-4">
						<div
							class="flex items-center justify-between gap-4"
						>
							<div>
								<p class="font-medium">
									{{
										data.poll.closedAt
											? 'Rouvrir le sondage'
											: 'Fermer le sondage'
									}}
								</p>
								<p class="text-sm text-neutral-500">
									{{
										data.poll.closedAt
											? 'Permettre de nouveau les réponses'
											: 'Empêcher les nouvelles réponses'
									}}
								</p>
							</div>
							<UButton
								:variant="
									data.poll.closedAt ? 'soft' : 'outline'
								"
								:color="
									data.poll.closedAt ? 'success' : 'warning'
								"
								:loading="isSaving"
								@click="toggleClosed"
							>
								{{
									data.poll.closedAt
										? 'Rouvrir'
										: 'Fermer'
								}}
							</UButton>
						</div>

						<USeparator />

						<div
							class="flex items-center justify-between gap-4"
						>
							<div>
								<p class="font-medium">
									Supprimer le sondage
								</p>
								<p class="text-sm text-neutral-500">
									Cette action est irréversible.
								</p>
							</div>
							<UButton
								color="error"
								variant="soft"
								@click="showDeleteConfirm = true"
							>
								Supprimer
							</UButton>
						</div>
					</div>
				</UCard>

				<!-- Delete confirmation modal -->
				<UModal
					v-model:open="showDeleteConfirm"
				>
					<template #header>
						<h3 class="text-lg font-semibold">
							Confirmer la suppression
						</h3>
					</template>
					<template #body>
						<p>
							Êtes-vous sûr de vouloir supprimer le sondage
							<strong>{{ data.poll.title }}</strong> ? Toutes les
							réponses seront perdues.
						</p>
					</template>
					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton
								variant="ghost"
								@click="showDeleteConfirm = false"
							>
								Annuler
							</UButton>
							<UButton
								color="error"
								:loading="isDeleting"
								@click="deletePoll"
							>
								Supprimer définitivement
							</UButton>
						</div>
					</template>
				</UModal>
			</template>
		</div>
	</UContainer>
</template>
