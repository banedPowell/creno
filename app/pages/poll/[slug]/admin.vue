<script setup lang="ts">
	import type { InternalApi } from 'nitropack/types';
	import { ADMIN_TOKEN_HEADER } from '#shared/utils/pollSettings';

	// A built URL matches every `/api/polls/*` route, the type has to be named
	type AdminPoll = InternalApi['/api/polls/:slug/admin']['get'];

	const route = useRoute();
	const slug = computed(() => String(route.params.slug));

	const { adminToken, isOwner, publicUrl, adminUrl } = usePollAdmin(slug);

	const headers = computed(() =>
		adminToken.value
			? { [ADMIN_TOKEN_HEADER]: adminToken.value }
			: undefined,
	);

	// The token only lives in this browser, the server render cannot load it
	const {
		data: poll,
		error,
		refresh,
		status,
	} = await useFetch<AdminPoll>(() => `/api/polls/${slug.value}/admin`, {
		headers,
		server: false,
		immediate: false,
		watch: false,
	});

	watch(
		adminToken,
		(token) => {
			if (token) refresh();
		},
		{ immediate: true },
	);

	const isNotFound = computed(() => error.value?.statusCode === 404);
	const isForbidden = computed(() => error.value?.statusCode === 403);

	useSeoMeta({
		title: () => (poll.value ? `${poll.value.title} · Creno` : 'Creno'),
		robots: 'noindex',
	});

	const {
		title,
		description,
		closingDate,
		options,
		snapMinutes,
		clickSlotDuration,
		dropPassword,
		draft,
		intent,
		focusedParticipantId,
		pending,
		isClosed,
		minDate,
		firstDay,
		chosenSlot,
		voteState,
		dirty,
		issue,
		summary,
		lostVotes,
		confirmOpen,
		pendingSlots,
		hasBest,
		bestLabel,
		revealBest,
		validateFields,
		resetDraft,
		arm,
		reopen,
		applySlots,
		save,
		deleteCreno,
	} = usePollAdminEditor(poll, slug, headers, refresh);
</script>

<template>
	<ClientOnly>
		<UForm
			:state="{ title, description }"
			:validate="validateFields"
			class="space-y-2"
		>
			<UPage>
				<template #left>
					<UPageAside>
						<div class="flex flex-col gap-6">
							<UFormField name="closedAt">
								<PollClosingField
									v-model="closingDate"
									:min-date="minDate"
								/>
							</UFormField>

							<PollGridSettings
								v-model:snap-minutes="snapMinutes"
								v-model:click-slot-duration="clickSlotDuration"
							/>

							<PollAdvancedOptions
								v-model="options"
								v-model:snap-minutes="snapMinutes"
								v-model:click-slot-duration="clickSlotDuration"
								:show-grid="false"
								:password-set="
									!!poll?.hasPassword && !dropPassword
								"
								@remove-password="dropPassword = true"
							/>

							<PollDeleteCard
								v-if="poll"
								:title="poll.title"
								:pending="pending === 'delete'"
								@confirm="deleteCreno"
							/>
						</div>
					</UPageAside>
				</template>

				<template #right>
					<UPageAside>
						<PollParticipants
							v-model="focusedParticipantId"
							:participants="poll?.participants ?? []"
						/>
					</UPageAside>
				</template>

				<UPageBody>
					<template v-if="!isOwner">
						<PollShareCard :url="publicUrl" title="ce Creno" />
						<p
							data-not-owner
							class="bg-elevated text-muted w-fit rounded-xl px-3 py-1.5 text-sm"
						>
							Ce Creno n’a pas été créé depuis ce navigateur :
							seul le partage est disponible ici.
						</p>
					</template>

					<UEmpty
						v-else-if="isNotFound"
						icon="i-lucide-calendar-x"
						title="Ce Creno est introuvable"
						description="Le lien est peut-être incomplet, ou le Creno n’existe plus."
						:actions="[
							{
								label: 'Retour à l’accueil',
								to: '/',
								color: 'neutral',
							},
						]"
					/>

					<UEmpty
						v-else-if="isForbidden"
						icon="i-lucide-key-round"
						title="Ce lien d’administration n’est plus valide"
						description="Seul le lien reçu à la création donne accès à l’administration."
						:actions="[
							{
								label: 'Retour à l’accueil',
								to: '/',
								color: 'neutral',
							},
						]"
					/>

					<UEmpty
						v-else-if="error"
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

					<template v-else-if="poll">
						<div>
							<UFormField name="title">
								<UInput
									v-model="title"
									variant="none"
									size="xl"
									aria-label="Titre du Creno"
									placeholder="Réunion d'équipe"
									class="w-full"
									data-details-title
									:ui="{
										base: 'text-highlighted placeholder:text-dimmed px-0 text-3xl font-bold aria-invalid:rounded-none aria-invalid:border-b-2 aria-invalid:border-error aria-invalid:ring-0 md:text-4xl',
									}"
								/>
							</UFormField>

							<UFormField name="description">
								<UTextarea
									v-model="description"
									variant="none"
									autoresize
									:rows="1"
									aria-label="Description du Creno"
									placeholder="Ajoutez une description (facultatif)"
									class="w-full"
									:ui="{
										base: 'text-muted placeholder:text-dimmed resize-none px-0 text-base aria-invalid:rounded-none aria-invalid:border-b-2 aria-invalid:border-error aria-invalid:ring-0',
									}"
								/>
							</UFormField>
						</div>

						<PollAdminStatus
							:closed="isClosed"
							:closed-at="
								intent === 'close' ? new Date() : poll.closedAt
							"
							:chosen-label="
								chosenSlot ? formatSlotLabel(chosenSlot) : null
							"
							:pending="pending === 'settings'"
							@close="arm('close')"
							@reopen="reopen"
							@unchoose="arm('unchoose')"
						/>

						<div class="grid gap-6 md:grid-cols-2">
							<PollShareCard
								:url="publicUrl"
								:title="title || poll.title"
							/>
							<PollAdminLinkCard
								v-if="adminUrl"
								:url="adminUrl"
							/>
						</div>

						<section class="space-y-3">
							<p class="text-muted text-sm">
								Cliquez un créneau pour le retenir. Déplacez-le
								pour garder ses réponses, la croix le retire.
								<template v-if="poll.hideResults">
									Vous voyez déjà les réponses. Les
									participants ne les voient qu’après avoir
									répondu, ou une fois le sondage terminé.
								</template>
							</p>

							<PollCalendar
								ref="calendar"
								v-model="draft"
								:initial-date="
									firstDay.upcoming
										? parseIsoDate(firstDay.upcoming)
										: undefined
								"
								:min-date="firstDay.first"
								:vote="voteState"
								:snap-minutes="snapMinutes"
								:click-slot-duration="clickSlotDuration"
							/>
						</section>

						<PollAdminBar
							v-model:confirm-open="confirmOpen"
							:dirty="dirty"
							:has-best="hasBest"
							:best-label="bestLabel"
							:summary="summary"
							:issue="issue"
							:pending="pending"
							:lost-votes="lostVotes"
							:pending-slots="pendingSlots"
							@reveal="revealBest"
							@cancel="resetDraft"
							@save="save"
							@confirm="applySlots"
						/>
					</template>

					<div
						v-else-if="status === 'pending' || status === 'idle'"
						class="space-y-4"
					>
						<USkeleton class="h-10 w-2/3" />
						<USkeleton class="h-24 w-full" />
					</div>

					<template #fallback>
						<div class="space-y-4">
							<USkeleton class="h-10 w-2/3" />
							<USkeleton class="h-24 w-full" />
						</div>
					</template>
				</UPageBody>
			</UPage>
		</UForm>
	</ClientOnly>
</template>
