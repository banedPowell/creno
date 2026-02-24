<script setup lang="ts">
	const route = useRoute();
	const slug = route.params.slug as string;
	const toast = useToast();

	useHead({ title: 'Sondage' });

	const shareUrl = computed(() => {
		if (import.meta.client) {
			return `${window.location.origin}/poll/${slug}`;
		}
		return `/poll/${slug}`;
	});

	const { data, refresh, status } = await useFetch(`/api/polls/${slug}`);

	watch(
		() => data.value?.poll?.title,
		(title) => {
			if (title) useHead({ title });
		},
		{ immediate: true },
	);

	const isParticipating = ref(false);
	const participantName = ref('');
	const myResponses = ref<Record<string, 'yes' | 'maybe' | 'no'>>({});
	const isSubmitting = ref(false);

	const editingParticipantId = ref<string | null>(null);
	const editName = ref('');
	const editResponses = ref<Record<string, 'yes' | 'maybe' | 'no'>>({});

	function startParticipating() {
		isParticipating.value = true;
		participantName.value = '';
		myResponses.value = {};
		if (data.value) {
			for (const slot of data.value.slots) {
				myResponses.value[slot.id] = 'no';
			}
		}
	}

	function cancelParticipating() {
		isParticipating.value = false;
		editingParticipantId.value = null;
	}

	function startEditing(participant: { id: string; name: string }) {
		editingParticipantId.value = participant.id;
		editName.value = participant.name;
		editResponses.value = {};
		if (data.value) {
			for (const slot of data.value.slots) {
				const resp = data.value.responses.find(
					(r) =>
						r.participantId === participant.id &&
						r.timeSlotId === slot.id,
				);
				editResponses.value[slot.id] = resp?.availability ?? 'no';
			}
		}
		isParticipating.value = true;
	}

	async function submitParticipation() {
		if (!participantName.value.trim() || !data.value) return;
		isSubmitting.value = true;
		try {
			await $fetch(`/api/polls/${slug}/participate`, {
				method: 'POST',
				body: {
					name: participantName.value.trim(),
					responses: data.value.slots.map((s) => ({
						timeSlotId: s.id,
						availability: myResponses.value[s.id] || 'no',
					})),
				},
			});
			toast.add({
				title: 'Réponse enregistrée !',
				icon: 'i-lucide-check',
				color: 'success',
			});
			isParticipating.value = false;
			await refresh();
		} catch {
			toast.add({
				title: "Erreur lors de l'enregistrement",
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isSubmitting.value = false;
		}
	}

	async function submitEdit() {
		if (
			!editingParticipantId.value ||
			!editName.value.trim() ||
			!data.value
		)
			return;
		isSubmitting.value = true;
		try {
			await $fetch(
				`/api/polls/${slug}/participants/${editingParticipantId.value}`,
				{
					method: 'PUT',
					body: {
						name: editName.value.trim(),
						responses: data.value.slots.map((s) => ({
							timeSlotId: s.id,
							availability:
								editResponses.value[s.id] || 'no',
						})),
					},
				},
			);
			toast.add({
				title: 'Réponse mise à jour !',
				icon: 'i-lucide-check',
				color: 'success',
			});
			isParticipating.value = false;
			editingParticipantId.value = null;
			await refresh();
		} catch {
			toast.add({
				title: 'Erreur lors de la mise à jour',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		} finally {
			isSubmitting.value = false;
		}
	}

	async function deleteParticipant(participantId: string) {
		try {
			await $fetch(`/api/polls/${slug}/participants/${participantId}`, {
				method: 'DELETE',
			});
			toast.add({
				title: 'Participant supprimé',
				icon: 'i-lucide-check',
				color: 'success',
			});
			await refresh();
		} catch {
			toast.add({
				title: 'Erreur lors de la suppression',
				icon: 'i-lucide-alert-circle',
				color: 'error',
			});
		}
	}

	function getParticipantAvailability(
		participantId: string,
		slotId: string,
	): 'yes' | 'maybe' | 'no' {
		if (!data.value) return 'no';
		const resp = data.value.responses.find(
			(r) =>
				r.participantId === participantId && r.timeSlotId === slotId,
		);
		return resp?.availability ?? 'no';
	}

	function getAvailabilityIcon(a: 'yes' | 'maybe' | 'no') {
		if (a === 'yes') return 'i-lucide-check';
		if (a === 'maybe') return 'i-lucide-help-circle';
		return 'i-lucide-x';
	}

	function getAvailabilityColor(a: 'yes' | 'maybe' | 'no') {
		if (a === 'yes')
			return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
		if (a === 'maybe')
			return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
		return 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500';
	}

	function formatSlotShort(slot: {
		date: string;
		startTime: string;
		endTime: string;
	}) {
		const d = new Date(slot.date + 'T00:00:00');
		const day = d.toLocaleDateString('fr-FR', {
			weekday: 'short',
			day: 'numeric',
		});
		return `${day} ${slot.startTime}`;
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
					name="i-lucide-search-x"
					class="mx-auto mb-4 h-12 w-12 text-neutral-300"
				/>
				<h2 class="text-xl font-semibold">Sondage introuvable</h2>
				<p class="mt-1 text-neutral-500">
					Ce sondage n'existe pas ou a été supprimé.
				</p>
				<UButton class="mt-4" variant="soft" to="/">
					Retour à l'accueil
				</UButton>
			</div>

			<!-- Poll content -->
			<template v-else>
				<PollHeader
					:title="data.poll.title"
					:description="data.poll.description"
					:slot-duration="data.poll.slotDuration"
					:slot-count="data.slots.length"
					:participant-count="data.participants.length"
					:closed="!!data.poll.closedAt"
				/>

				<div class="mt-6">
					<BestSlotBanner
						:slots="data.slots"
						:responses="data.responses"
						:participant-count="data.participants.length"
					/>
				</div>

				<!-- Calendar participation -->
				<div class="mt-6">
					<!-- New participation mode -->
					<div
						v-if="isParticipating && !editingParticipantId"
						class="space-y-4"
					>
						<div
							class="rounded-lg border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-800 dark:bg-primary-950/20"
						>
							<h3
								class="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300"
							>
								Indiquez vos disponibilités
							</h3>
							<UFormField label="Votre nom" required>
								<UInput
									v-model="participantName"
									placeholder="Prénom Nom"
									size="sm"
									class="max-w-xs"
								/>
							</UFormField>
						</div>

						<CalendarResponse
							v-model="myResponses"
							:slots="data.slots"
							:participants="data.participants"
							:responses="data.responses"
						/>

						<div class="flex items-center gap-2">
							<UButton
								variant="ghost"
								@click="cancelParticipating"
							>
								Annuler
							</UButton>
							<UButton
								:disabled="
									!participantName.trim() || isSubmitting
								"
								:loading="isSubmitting"
								@click="submitParticipation"
							>
								Valider ma réponse
							</UButton>
						</div>
					</div>

					<!-- Edit participation mode -->
					<div
						v-else-if="
							isParticipating && editingParticipantId
						"
						class="space-y-4"
					>
						<div
							class="rounded-lg border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-800 dark:bg-primary-950/20"
						>
							<h3
								class="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300"
							>
								Modifier vos disponibilités
							</h3>
							<UFormField label="Votre nom" required>
								<UInput
									v-model="editName"
									placeholder="Prénom Nom"
									size="sm"
									class="max-w-xs"
								/>
							</UFormField>
						</div>

						<CalendarResponse
							v-model="editResponses"
							:slots="data.slots"
							:participants="data.participants"
							:responses="data.responses"
						/>

						<div class="flex items-center gap-2">
							<UButton
								variant="ghost"
								@click="cancelParticipating"
							>
								Annuler
							</UButton>
							<UButton
								:disabled="
									!editName.trim() || isSubmitting
								"
								:loading="isSubmitting"
								@click="submitEdit"
							>
								Enregistrer les modifications
							</UButton>
						</div>
					</div>

					<!-- Read-only calendar view (default) -->
					<div v-else class="space-y-4">
						<CalendarResponse
							:model-value="{}"
							:slots="data.slots"
							:participants="data.participants"
							:responses="data.responses"
							readonly
						/>

						<UButton
							v-if="!data.poll.closedAt"
							leading-icon="i-lucide-plus"
							variant="soft"
							size="lg"
							@click="startParticipating"
						>
							Participer au sondage
						</UButton>
					</div>
				</div>

				<!-- Participants summary -->
				<div
					v-if="data.participants.length > 0"
					class="mt-8"
				>
					<h3
						class="mb-3 text-lg font-semibold"
					>
						Participants ({{ data.participants.length }})
					</h3>

					<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
						<table
							class="w-full min-w-[500px] border-collapse text-sm"
						>
							<thead>
								<tr>
									<th
										class="sticky left-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 p-2 text-left text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
									>
										Nom
									</th>
									<th
										v-for="slot in data.slots"
										:key="slot.id"
										class="border-b border-r border-neutral-200 bg-neutral-50 p-2 text-center text-[11px] font-medium last:border-r-0 dark:border-neutral-700 dark:bg-neutral-800"
									>
										{{ formatSlotShort(slot) }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="participant in data.participants"
									:key="participant.id"
									class="group"
								>
									<td
										class="sticky left-0 z-10 border-b border-r border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
									>
										<div
											class="flex items-center gap-1"
										>
											<span class="font-medium">{{
												participant.name
											}}</span>
											<div
												v-if="!data.poll.closedAt"
												class="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<UButton
													icon="i-lucide-pencil"
													variant="ghost"
													size="xs"
													@click="
														startEditing(
															participant,
														)
													"
												/>
												<UButton
													icon="i-lucide-trash-2"
													variant="ghost"
													size="xs"
													color="error"
													@click="
														deleteParticipant(
															participant.id,
														)
													"
												/>
											</div>
										</div>
									</td>
									<td
										v-for="slot in data.slots"
										:key="slot.id"
										class="border-b border-r border-neutral-200 p-1 text-center last:border-r-0 dark:border-neutral-700"
									>
										<div
											class="mx-auto flex h-6 w-6 items-center justify-center rounded-full"
											:class="
												getAvailabilityColor(
													getParticipantAvailability(
														participant.id,
														slot.id,
													),
												)
											"
										>
											<UIcon
												:name="
													getAvailabilityIcon(
														getParticipantAvailability(
															participant.id,
															slot.id,
														),
													)
												"
												class="h-3.5 w-3.5"
											/>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<!-- Share section -->
				<ClientOnly>
					<div
						class="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
					>
						<h3
							class="text-sm font-semibold text-neutral-600 dark:text-neutral-400"
						>
							Partager ce sondage
						</h3>
						<div class="mt-2 flex items-center gap-2">
							<UInput
								:model-value="shareUrl"
								readonly
								size="sm"
								class="flex-1"
							/>
							<UButton
								icon="i-lucide-copy"
								variant="soft"
								size="sm"
								@click="
									() => {
										navigator.clipboard.writeText(
											shareUrl,
										);
										toast.add({
											title: 'Lien copié !',
											icon: 'i-lucide-check',
											color: 'success',
										});
									}
								"
							/>
						</div>
					</div>
				</ClientOnly>
			</template>
		</div>
	</UContainer>
</template>
