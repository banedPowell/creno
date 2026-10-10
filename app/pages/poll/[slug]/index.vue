<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import type { FormError } from '@nuxt/ui';
	import type { InternalApi } from 'nitropack/types';
	import type { CalendarVoteState, VoteStatus } from '~/types/calendar';
	import type { OwnVote } from '~/composables/useOwnVotes';

	// A built URL matches every `/api/polls/*` route, the type has to be named
	type PollResults = InternalApi['/api/polls/:slug/results']['get'];

	const haptic = useWebHaptics();
	const route = useRoute();
	const slug = computed(() => String(route.params.slug));

	const {
		data: poll,
		error,
		refresh,
	} = await useFetch<PollResults>(() => `/api/polls/${slug.value}/results`);

	const isNotFound = computed(() => error.value?.statusCode === 404);

	useSeoMeta({
		title: () => (poll.value ? `${poll.value.title} · Creno` : 'Creno'),
		robots: 'noindex',
	});

	const now = useNow({ interval: 60_000 });
	// The server's word wins over a clock that only ticks every minute
	const closedByServer = shallowRef(false);
	const isClosed = computed(
		() =>
			closedByServer.value ||
			(!!poll.value && new Date(poll.value.closedAt) <= now.value),
	);

	// Anyone may change anyone's answer, instead of only their own
	const isOpenPolicy = computed(() => poll.value?.votePolicy === 'open');

	const calendarSlots = computed(
		() => poll.value?.slots.map(apiSlotToCalendarSlot) ?? [],
	);

	// The calendar opens on the first slot still to come, and can always go
	// back to the first one of all
	const firstDay = computed(() => {
		const days = calendarSlots.value.map((slot) => slot.startDate).sort();
		const today = isoDate(now.value);
		return {
			first: days[0] ? parseIsoDate(days[0]) : undefined,
			upcoming: days.find((day) => day >= today) ?? days.at(-1),
		};
	});

	const state = reactive({ name: '' });
	const votes = ref<Record<string, VoteStatus>>({});
	const focusedParticipantId = ref<string | null>(null);
	// The answer the form holds, null for a new one
	const editingId = ref<string | null>(null);

	const { save, get, forget } = useOwnVotes();
	// Read once mounted: the server cannot see this browser's storage
	const ownEntry = shallowRef<OwnVote | null>(null);
	const isEditingOwn = computed(
		() =>
			!!editingId.value &&
			editingId.value === ownEntry.value?.participantId,
	);

	const participantName = (id: string) =>
		poll.value?.participants.find((p) => p.id === id)?.name ?? '';

	const resetForm = () => {
		editingId.value = null;
		state.name = '';
		votes.value = {};
	};

	// Fills the form with an answer already sent
	const loadAnswer = (participantId: string) => {
		if (!poll.value?.participants.some((p) => p.id === participantId))
			return;
		state.name = participantName(participantId);
		votes.value = Object.fromEntries(
			poll.value.slots.flatMap((slot) =>
				slot.voters
					.filter((voter) => voter.id === participantId)
					.map((voter) => [slot.id, voter.status]),
			),
		);
		editingId.value = participantId;
	};

	const forgetOwn = () => {
		forget(slug.value);
		ownEntry.value = null;
	};

	// One answer per browser: once sent, the page comes back to it
	onMounted(() => {
		const entry = get(slug.value);
		if (!entry) return;
		if (!poll.value?.participants.some((p) => p.id === entry.participantId))
			return forgetOwn();
		ownEntry.value = entry;
		if (!isClosed.value) loadAnswer(entry.participantId);
	});

	const cycleVote = (slotId: string) => {
		const { [slotId]: current, ...rest } = votes.value;
		votes.value =
			current === undefined
				? { ...rest, [slotId]: 'yes' }
				: current === 'yes'
					? { ...rest, [slotId]: 'maybe' }
					: rest;
	};

	const voteState: CalendarVoteState = {
		votes,
		// The answer being changed already shows through the slot colours, it
		// is not counted a second time
		voters: computed(() =>
			Object.fromEntries(
				(poll.value?.slots ?? []).map((slot) => [
					slot.id,
					slot.voters.filter((voter) => voter.id !== editingId.value),
				]),
			),
		),
		bestSlotIds: computed(() => bestSlotIds(poll.value?.slots ?? [])),
		readonly: isClosed,
		focusedParticipantId,
		cycleVote,
	};

	const editing = computed(() =>
		editingId.value
			? {
					name: participantName(editingId.value),
					own: isEditingOwn.value,
				}
			: null,
	);

	// Going back to a new answer only makes sense where several are allowed
	const cancellable = computed(() => isOpenPolicy.value);

	// Everything sent goes through this one check, the form only displays it
	const result = computed(() =>
		buildVotePayload({ name: state.name, votes: votes.value }),
	);

	const isValid = computed(() => result.value.success);

	const validate = (): FormError[] =>
		result.value.success
			? []
			: result.value.issues.map(({ path, message }) => ({
					name: path,
					message,
				}));

	const summary = computed(() => {
		if (!result.value.success) return result.value.issues[0]!.message;
		const answers = Object.values(votes.value);
		const yes = answers.filter((status) => status === 'yes').length;
		const maybe = answers.length - yes;
		if (!answers.length) return 'Absent sur tous les créneaux';
		return [
			yes && `${yes} présence${yes > 1 ? 's' : ''}`,
			maybe && `${maybe} peut-être`,
		]
			.filter(Boolean)
			.join(' · ');
	});

	const submitLabel = computed(() =>
		!editingId.value
			? 'Envoyer ma réponse'
			: isEditingOwn.value
				? 'Modifier ma réponse'
				: 'Enregistrer les modifications',
	);

	const { sizeXl } = useResponsiveButtonSize();
	const toast = useToast();
	const pending = shallowRef(false);

	const sendNew = async (body: VotePayload) => {
		const created = await $fetch<{ id: string; editToken?: string | null }>(
			`/api/polls/${slug.value}/vote`,
			{ method: 'POST', body },
		);
		if (created.editToken) {
			ownEntry.value = {
				participantId: created.id,
				editToken: created.editToken,
			};
			save(slug.value, ownEntry.value);
		}
		toast.add({
			title: 'Merci, votre réponse est enregistrée',
			description: 'Vous pourrez la modifier depuis ce navigateur.',
			color: 'success',
		});
		await refresh();
		loadAnswer(created.id);
	};

	const sendChange = async (participantId: string, body: VotePayload) => {
		const own = isEditingOwn.value;
		await $fetch(`/api/polls/${slug.value}/participants/${participantId}`, {
			method: 'PUT',
			body,
			headers: own
				? { [EDIT_TOKEN_HEADER]: ownEntry.value!.editToken }
				: undefined,
		});
		toast.add({
			title: own
				? 'Votre réponse est modifiée'
				: `Réponse de ${participantName(participantId)} modifiée`,
			color: 'success',
		});
		await refresh();
		if (own) loadAnswer(participantId);
		else resetForm();
	};

	async function onSubmit() {
		if (!result.value.success || pending.value) return;
		pending.value = true;
		try {
			if (editingId.value)
				await sendChange(editingId.value, result.value.data);
			else await sendNew(result.value.data);
		} catch (failure) {
			const { statusCode, data } = failure as {
				statusCode?: number;
				data?: { message?: string };
			};
			if (statusCode === 410) {
				closedByServer.value = true;
				toast.add({
					title: 'Ce Creno vient de fermer',
					description: 'Votre réponse n’a pas pu être enregistrée.',
					color: 'warning',
				});
				await refresh();
			} else if (
				editingId.value &&
				(statusCode === 403 || statusCode === 404)
			) {
				// The stored token no longer matches anything this browser may
				// change, it starts over with a new answer
				if (isEditingOwn.value) forgetOwn();
				resetForm();
				toast.add({
					title:
						statusCode === 403
							? 'Vous ne pouvez modifier que votre propre réponse'
							: 'Cette réponse n’existe plus',
					color: 'error',
				});
				await refresh();
			} else {
				toast.add({
					title: 'Erreur',
					description: data?.message ?? 'Une erreur est survenue.',
					color: 'error',
				});
			}
		} finally {
			pending.value = false;
		}
	}

	const onEditParticipant = (id: string) => {
		loadAnswer(id);
		focusedParticipantId.value = null;
	};
</script>

<template>
	<UContainer class="mt-8 max-w-5xl space-y-6 pb-28 md:mt-12">
		<UEmpty
			v-if="isNotFound"
			icon="i-lucide-calendar-x"
			title="Ce Creno est introuvable"
			description="Le lien est peut-être incomplet, ou le Creno n’existe plus."
			:actions="[
				{ label: 'Retour à l’accueil', to: '/', color: 'neutral' },
			]"
		/>

		<UEmpty
			v-else-if="error || !poll"
			icon="i-lucide-cloud-off"
			title="Impossible de charger ce Creno"
			description="Vérifie ta connexion puis réessaie."
			:actions="[
				{
					label: 'Réessayer',
					icon: 'i-lucide-rotate-cw',
					color: 'neutral',
					onClick: () => refresh(),
				},
			]"
		/>

		<template v-else>
			<PollSummary
				:title="poll.title"
				:description="poll.description"
				:slot-count="poll.slots.length"
				:closed-at="poll.closedAt"
			/>

			<UAlert
				v-if="isClosed"
				data-poll-closed
				icon="i-lucide-lock"
				color="neutral"
				variant="subtle"
				title="Ce Creno est fermé"
				:description="`Les votes ont pris fin le ${formatFullDate(new Date(poll.closedAt))}. Voici les réponses reçues.`"
			/>

			<UForm
				:state="state"
				:validate="validate"
				class="space-y-6"
				@submit="onSubmit"
			>
				<UFormField v-if="!isClosed" name="name">
					<PollNameField
						v-model="state.name"
						:editing="editing"
						:cancellable="cancellable"
						@cancel="resetForm"
					/>
				</UFormField>

				<UFormField name="votes">
					<CalendarRoot
						:model-value="calendarSlots"
						:hour-start="0"
						:hour-end="24"
						:initial-date="
							firstDay.upcoming
								? parseIsoDate(firstDay.upcoming)
								: undefined
						"
						:min-date="firstDay.first"
						:vote="voteState"
					/>
				</UFormField>

				<PollParticipants
					v-model="focusedParticipantId"
					:participants="poll.participants"
					:own-id="ownEntry?.participantId"
					:can-edit="isOpenPolicy && !isClosed"
					:editing-id="editingId"
					@edit="onEditParticipant"
				/>

				<div v-if="!isClosed" class="sticky bottom-4 z-40">
					<div
						class="bg-elevated/85 ring-default flex flex-col gap-1.5 rounded-xl p-1.5 shadow-lg ring backdrop-blur sm:flex-row sm:items-center sm:justify-between"
					>
						<p
							data-vote-summary
							class="bg-default rounded-lg px-3 py-1.5 text-sm tabular-nums"
							:class="isValid ? 'text-highlighted' : 'text-muted'"
						>
							{{ summary }}
						</p>

						<UButton
							type="submit"
							:label="submitLabel"
							:trailing-icon="
								editingId ? 'i-lucide-check' : 'i-lucide-send'
							"
							color="neutral"
							variant="solid"
							:size="sizeXl"
							:loading="pending"
							:disabled="pending || !isValid"
							class="press w-full justify-center sm:w-fit"
							@click="haptic.trigger('medium')"
						/>
					</div>
				</div>
			</UForm>
		</template>
	</UContainer>
</template>
