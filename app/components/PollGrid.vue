<script setup lang="ts">
	interface TimeSlot {
		id: string;
		pollId: string;
		date: string;
		startTime: string;
		endTime: string;
	}

	interface Participant {
		id: string;
		pollId: string;
		name: string;
		createdAt: Date;
	}

	interface Response {
		id: string;
		participantId: string;
		timeSlotId: string;
		availability: 'yes' | 'maybe' | 'no';
	}

	const props = defineProps<{
		slots: TimeSlot[];
		participants: Participant[];
		responses: Response[];
		closed?: boolean;
	}>();

	const emit = defineEmits<{
		participate: [data: { name: string; responses: { timeSlotId: string; availability: string }[] }];
		updateParticipant: [data: { participantId: string; name: string; responses: { timeSlotId: string; availability: string }[] }];
		deleteParticipant: [participantId: string];
	}>();

	const isAdding = ref(false);
	const newName = ref('');
	const newResponses = ref<Record<string, 'yes' | 'maybe' | 'no'>>({});
	const editingParticipantId = ref<string | null>(null);
	const editName = ref('');
	const editResponses = ref<Record<string, 'yes' | 'maybe' | 'no'>>({});

	const groupedSlots = computed(() => {
		const groups: { date: string; label: string; slots: TimeSlot[] }[] = [];
		const map = new Map<string, TimeSlot[]>();

		for (const slot of props.slots) {
			if (!map.has(slot.date)) map.set(slot.date, []);
			map.get(slot.date)!.push(slot);
		}

		for (const [date, dateSlots] of map) {
			const d = new Date(date + 'T00:00:00');
			groups.push({
				date,
				label: d.toLocaleDateString('fr-FR', {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
				}),
				slots: dateSlots.sort((a, b) =>
					a.startTime.localeCompare(b.startTime),
				),
			});
		}

		return groups.sort((a, b) => a.date.localeCompare(b.date));
	});

	const slotScores = computed(() => {
		const scores: Record<string, { yes: number; maybe: number; total: number }> = {};
		for (const slot of props.slots) {
			scores[slot.id] = { yes: 0, maybe: 0, total: 0 };
		}
		for (const resp of props.responses) {
			if (!scores[resp.timeSlotId]) continue;
			if (resp.availability === 'yes') {
				scores[resp.timeSlotId].yes++;
				scores[resp.timeSlotId].total += 2;
			} else if (resp.availability === 'maybe') {
				scores[resp.timeSlotId].maybe++;
				scores[resp.timeSlotId].total += 1;
			}
		}
		return scores;
	});

	const bestSlotId = computed(() => {
		if (props.participants.length === 0) return null;
		let bestId: string | null = null;
		let bestScore = -1;

		for (const slot of props.slots) {
			const score = slotScores.value[slot.id]?.total ?? 0;
			if (score > bestScore) {
				bestScore = score;
				bestId = slot.id;
			}
		}
		return bestScore > 0 ? bestId : null;
	});

	function getResponse(
		participantId: string,
		slotId: string,
	): 'yes' | 'maybe' | 'no' {
		const resp = props.responses.find(
			(r) =>
				r.participantId === participantId && r.timeSlotId === slotId,
		);
		return resp?.availability ?? 'no';
	}

	function toggleAvailability(
		record: Record<string, 'yes' | 'maybe' | 'no'>,
		slotId: string,
	) {
		const current = record[slotId] || 'no';
		if (current === 'no') record[slotId] = 'yes';
		else if (current === 'yes') record[slotId] = 'maybe';
		else record[slotId] = 'no';
	}

	function startAdding() {
		isAdding.value = true;
		newName.value = '';
		newResponses.value = {};
		for (const slot of props.slots) {
			newResponses.value[slot.id] = 'no';
		}
	}

	function cancelAdding() {
		isAdding.value = false;
	}

	function submitNew() {
		if (!newName.value.trim()) return;
		emit('participate', {
			name: newName.value.trim(),
			responses: props.slots.map((s) => ({
				timeSlotId: s.id,
				availability: newResponses.value[s.id] || 'no',
			})),
		});
		isAdding.value = false;
	}

	function startEditing(participant: Participant) {
		editingParticipantId.value = participant.id;
		editName.value = participant.name;
		editResponses.value = {};
		for (const slot of props.slots) {
			editResponses.value[slot.id] = getResponse(participant.id, slot.id);
		}
	}

	function cancelEditing() {
		editingParticipantId.value = null;
	}

	function submitEdit() {
		if (!editingParticipantId.value || !editName.value.trim()) return;
		emit('updateParticipant', {
			participantId: editingParticipantId.value,
			name: editName.value.trim(),
			responses: props.slots.map((s) => ({
				timeSlotId: s.id,
				availability: editResponses.value[s.id] || 'no',
			})),
		});
		editingParticipantId.value = null;
	}

	function getAvailabilityIcon(availability: 'yes' | 'maybe' | 'no') {
		if (availability === 'yes') return 'i-lucide-check';
		if (availability === 'maybe') return 'i-lucide-help-circle';
		return 'i-lucide-x';
	}

	function getAvailabilityColor(availability: 'yes' | 'maybe' | 'no') {
		if (availability === 'yes')
			return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
		if (availability === 'maybe')
			return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
		return 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500';
	}

	function getScoreBarWidth(slotId: string): string {
		const maxPossible = props.participants.length * 2;
		if (maxPossible === 0) return '0%';
		const score = slotScores.value[slotId]?.total ?? 0;
		return `${(score / maxPossible) * 100}%`;
	}
</script>

<template>
	<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
		<table class="w-full min-w-[600px] border-collapse">
			<!-- Date header row -->
			<thead>
				<tr>
					<th
						class="sticky left-0 z-10 min-w-[140px] border-b border-r border-neutral-200 bg-neutral-50 p-2 text-left dark:border-neutral-700 dark:bg-neutral-800"
					/>
					<th
						v-for="group in groupedSlots"
						:key="group.date"
						:colspan="group.slots.length"
						class="border-b border-r border-neutral-200 bg-neutral-50 p-2 text-center text-xs font-semibold last:border-r-0 dark:border-neutral-700 dark:bg-neutral-800"
					>
						{{ group.label }}
					</th>
				</tr>
				<!-- Time header row -->
				<tr>
					<th
						class="sticky left-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 p-2 text-left text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
					>
						Participants
					</th>
					<th
						v-for="slot in slots"
						:key="slot.id"
						class="border-b border-r border-neutral-200 bg-neutral-50 p-2 text-center text-[11px] font-medium last:border-r-0 dark:border-neutral-700 dark:bg-neutral-800"
						:class="{
							'bg-green-50 dark:bg-green-950/20':
								bestSlotId === slot.id,
						}"
					>
						<div>{{ slot.startTime }}</div>
						<div class="text-neutral-400">{{ slot.endTime }}</div>
					</th>
				</tr>
			</thead>

			<tbody>
				<!-- Existing participants -->
				<tr
					v-for="participant in participants"
					:key="participant.id"
					class="group"
				>
					<td
						class="sticky left-0 z-10 border-b border-r border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
					>
						<div
							v-if="editingParticipantId !== participant.id"
							class="flex items-center gap-1"
						>
							<span class="text-sm font-medium">{{
								participant.name
							}}</span>
							<div
								v-if="!closed"
								class="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<UButton
									icon="i-lucide-pencil"
									variant="ghost"
									size="xs"
									@click="startEditing(participant)"
								/>
								<UButton
									icon="i-lucide-trash-2"
									variant="ghost"
									size="xs"
									color="error"
									@click="
										emit(
											'deleteParticipant',
											participant.id,
										)
									"
								/>
							</div>
						</div>
						<div v-else class="flex items-center gap-1">
							<UInput
								v-model="editName"
								size="xs"
								class="w-full"
								@keyup.enter="submitEdit"
							/>
						</div>
					</td>

					<td
						v-for="slot in slots"
						:key="slot.id"
						class="border-b border-r border-neutral-200 p-1 text-center last:border-r-0 dark:border-neutral-700"
						:class="{
							'bg-green-50/50 dark:bg-green-950/10':
								bestSlotId === slot.id,
						}"
					>
						<!-- View mode -->
						<div
							v-if="editingParticipantId !== participant.id"
							class="flex items-center justify-center"
						>
							<div
								class="flex h-7 w-7 items-center justify-center rounded-full text-sm"
								:class="
									getAvailabilityColor(
										getResponse(participant.id, slot.id),
									)
								"
							>
								<UIcon
									:name="
										getAvailabilityIcon(
											getResponse(
												participant.id,
												slot.id,
											),
										)
									"
									class="h-4 w-4"
								/>
							</div>
						</div>
						<!-- Edit mode -->
						<button
							v-else
							class="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-all hover:scale-110 mx-auto"
							:class="
								getAvailabilityColor(
									editResponses[slot.id] || 'no',
								)
							"
							@click="toggleAvailability(editResponses, slot.id)"
						>
							<UIcon
								:name="
									getAvailabilityIcon(
										editResponses[slot.id] || 'no',
									)
								"
								class="h-4 w-4"
							/>
						</button>
					</td>
				</tr>

				<!-- Edit action row -->
				<tr v-if="editingParticipantId">
					<td
						:colspan="slots.length + 1"
						class="border-b border-neutral-200 p-2 dark:border-neutral-700"
					>
						<div class="flex justify-end gap-2">
							<UButton
								variant="ghost"
								size="xs"
								@click="cancelEditing"
							>
								Annuler
							</UButton>
							<UButton size="xs" @click="submitEdit">
								Enregistrer
							</UButton>
						</div>
					</td>
				</tr>

				<!-- New participant row -->
				<tr v-if="isAdding">
					<td
						class="sticky left-0 z-10 border-b border-r border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
					>
						<UInput
							v-model="newName"
							placeholder="Votre nom"
							size="sm"
							class="w-full"
							@keyup.enter="submitNew"
						/>
					</td>
					<td
						v-for="slot in slots"
						:key="slot.id"
						class="border-b border-r border-neutral-200 p-1 text-center last:border-r-0 dark:border-neutral-700"
					>
						<button
							class="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-all hover:scale-110 mx-auto"
							:class="
								getAvailabilityColor(
									newResponses[slot.id] || 'no',
								)
							"
							@click="
								toggleAvailability(newResponses, slot.id)
							"
						>
							<UIcon
								:name="
									getAvailabilityIcon(
										newResponses[slot.id] || 'no',
									)
								"
								class="h-4 w-4"
							/>
						</button>
					</td>
				</tr>

				<!-- Summary row -->
				<tr class="bg-neutral-50 dark:bg-neutral-800/50">
					<td
						class="sticky left-0 z-10 border-r border-neutral-200 bg-neutral-50 p-2 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
					>
						Total
					</td>
					<td
						v-for="slot in slots"
						:key="slot.id"
						class="border-r border-neutral-200 p-2 text-center last:border-r-0 dark:border-neutral-700"
						:class="{
							'bg-green-50 dark:bg-green-950/20':
								bestSlotId === slot.id,
						}"
					>
						<div class="flex flex-col items-center gap-1">
							<div class="flex items-center gap-1 text-xs">
								<span class="font-semibold text-green-600">{{
									slotScores[slot.id]?.yes ?? 0
								}}</span>
								<span class="text-neutral-300">/</span>
								<span class="text-amber-500">{{
									slotScores[slot.id]?.maybe ?? 0
								}}</span>
							</div>
							<div
								class="h-1 w-full max-w-[40px] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
							>
								<div
									class="h-full rounded-full bg-green-500 transition-all"
									:style="{
										width: getScoreBarWidth(slot.id),
									}"
								/>
							</div>
							<UBadge
								v-if="bestSlotId === slot.id"
								color="success"
								variant="subtle"
								size="xs"
							>
								Meilleur
							</UBadge>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- Add participant button -->
	<div v-if="!closed" class="mt-4 flex items-center gap-2">
		<UButton
			v-if="!isAdding"
			leading-icon="i-lucide-plus"
			variant="soft"
			@click="startAdding"
		>
			Participer
		</UButton>
		<template v-else>
			<UButton variant="ghost" @click="cancelAdding">Annuler</UButton>
			<UButton :disabled="!newName.trim()" @click="submitNew">
				Valider ma réponse
			</UButton>
		</template>
	</div>
</template>
