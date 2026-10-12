<script setup lang="ts">
	import type { InternalApi } from 'nitropack/types';
	import type { OwnVote } from '~/composables/useOwnVotes';
	import {
		ADMIN_TOKEN_HEADER,
		PASSWORD_HEADER,
	} from '#shared/utils/pollSettings';
	import { EDIT_TOKEN_HEADER } from '#shared/utils/votePayload';

	type PollResults = InternalApi['/api/polls/:slug/results']['get'];

	const route = useRoute();
	const slug = computed(() => String(route.params.slug));
	const { getAdminToken } = useOwnedPolls();

	const ownEntry = shallowRef<OwnVote | null>(null);
	const password = useSessionStorage(`creno:password:${slug.value}`, '');
	const mounted = useMounted();
	const credentials = computed<Record<string, string>>(() => {
		if (!mounted.value) return {};
		const adminToken = getAdminToken(slug.value);
		return {
			...(password.value
				? { [PASSWORD_HEADER]: encodeURIComponent(password.value) }
				: {}),
			...(ownEntry.value
				? { [EDIT_TOKEN_HEADER]: ownEntry.value.editToken }
				: {}),
			...(adminToken ? { [ADMIN_TOKEN_HEADER]: adminToken } : {}),
		};
	});

	const {
		data: poll,
		error,
		refresh,
	} = await useFetch<PollResults>(() => `/api/polls/${slug.value}/results`, {
		headers: credentials,
		watch: false,
	});

	const {
		isNotFound,
		needsPassword,
		wrongPassword,
		unlocking,
		unlock,
		isClosed,
		isOpenPolicy,
		calendarSlots,
		firstDay,
		state,
		focusedParticipantId,
		editingId,
		revising,
		voteState,
		chosenSlot,
		editing,
		locked,
		isValid,
		validate,
		summary,
		pending,
		hasBest,
		bestLabel,
		count: bestCount,
		revealBest,
		onSubmit,
		startRevision,
		cancelRevision,
		onEditParticipant,
	} = usePollAnswer(
		slug,
		poll,
		error,
		refresh,
		credentials,
		ownEntry,
		password,
	);

	useSeoMeta({
		title: () => (poll.value ? `${poll.value.title} · Creno` : 'Creno'),
		robots: 'noindex',
	});
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

		<PollPasswordPrompt
			v-else-if="needsPassword"
			:wrong="wrongPassword"
			:pending="unlocking"
			@submit="unlock"
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
			<PollSummary :title="poll.title" :description="poll.description" />

			<UAlert
				v-if="chosenSlot"
				data-poll-chosen
				icon="i-lucide-calendar-check"
				color="success"
				variant="subtle"
				:title="`Créneau retenu : ${formatSlotLabel(chosenSlot)}`"
				description="L’organisateur a fait son choix, les votes sont fermés."
			/>

			<UAlert
				v-else-if="isClosed"
				data-poll-closed
				icon="i-lucide-lock"
				color="neutral"
				variant="subtle"
				title="Ce Creno est fermé"
				:description="`Les votes ont pris fin le ${formatFullDate(new Date(poll.closedAt))}. Voici les réponses reçues.`"
			/>

			<UAlert
				v-if="poll.resultsHidden && !isClosed"
				data-results-hidden
				icon="i-lucide-eye-off"
				color="neutral"
				variant="subtle"
				title="Les réponses des autres apparaîtront après la vôtre"
				description="Répondez sans être influencé par les choix des autres."
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
						:editing="revising ? editing : null"
						:disabled="locked"
					/>
				</UFormField>

				<UFormField name="votes">
					<CalendarRoot
						ref="calendar"
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

				<PollAnswerBar
					:is-closed="isClosed"
					:has-best="hasBest"
					:best-count="bestCount"
					:best-label="bestLabel"
					:summary="summary"
					:is-valid="isValid"
					:locked="locked"
					:revising="revising"
					:pending="pending"
					@reveal="revealBest"
					@revise="startRevision"
					@cancel="cancelRevision"
				/>
			</UForm>
		</template>
	</UContainer>
</template>
