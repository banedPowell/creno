<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import { CalendarDate } from '@internationalized/date';
	import type { InternalApi } from 'nitropack/types';
	import type {
		CalendarTimeSlot,
		CalendarVoteState,
		VoteStatus,
	} from '~/types/calendar';
	import {
		ADMIN_TOKEN_HEADER,
		DEFAULT_POLL_OPTIONS,
		pollDescriptionSchema,
		pollPasswordSchema,
		pollTitleSchema,
		type PollOptions,
		type PollSettingsInput,
	} from '#shared/utils/pollSettings';

	// A built URL matches every `/api/polls/*` route, the type has to be named
	type AdminPoll = InternalApi['/api/polls/:slug/admin']['get'];

	const haptic = useWebHaptics();
	const route = useRoute();
	const slug = computed(() => String(route.params.slug));

	const { adminToken, isOwner, publicUrl, adminUrl } = usePollAdmin(slug);
	const { removePoll } = useOwnedPolls();

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

	const now = useNow({ interval: 60_000 });

	const savedSlots = computed(
		() => poll.value?.slots.map(apiSlotToCalendarSlot) ?? [],
	);

	const title = ref('');
	const description = ref('');
	const closingDate = shallowRef(new CalendarDate(2026, 1, 1));
	const options = ref<PollOptions>({ ...DEFAULT_POLL_OPTIONS });
	const snapMinutes = ref(30);
	const clickSlotDuration = ref(120);
	const selectedId = ref<string | null>(null);
	const dropPassword = ref(false);
	const draft = ref<CalendarTimeSlot[]>([]);
	// Armed from the status card, sent with the bar’s Enregistrer
	const intent = ref<null | 'close' | 'unchoose'>(null);
	// A fresh clock: the calendar line only moves once a minute, and closing
	// sets the end to this very moment
	const isClosed = computed(
		() =>
			intent.value === 'close' ||
			(!!poll.value &&
				new Date(poll.value.closedAt).getTime() <= Date.now()),
	);

	const toCalendarDate = (value: string | Date) => {
		const date = new Date(value);
		return new CalendarDate(
			date.getFullYear(),
			date.getMonth() + 1,
			date.getDate(),
		);
	};

	const today = new Date();
	const minDate = new CalendarDate(
		today.getFullYear(),
		today.getMonth() + 1,
		today.getDate(),
	);

	const resetDraft = () => {
		if (!poll.value) return;
		title.value = poll.value.title;
		description.value = poll.value.description ?? '';
		closingDate.value = toCalendarDate(poll.value.closedAt);
		options.value = {
			votePolicy: poll.value.votePolicy,
			hideResults: poll.value.hideResults,
			password: '',
		};
		dropPassword.value = false;
		draft.value = savedSlots.value.map((slot) => ({ ...slot }));
		intent.value = null;
		selectedId.value = null;
	};
	watch(poll, resetDraft);

	const firstDay = computed(() => {
		const days = draft.value.map((slot) => slot.startDate).sort();
		const today = isoDate(now.value);
		return {
			first: days[0] ? parseIsoDate(days[0]) : undefined,
			upcoming: days.find((day) => day >= today) ?? days.at(-1),
		};
	});

	const chosenSlot = computed(() =>
		draft.value.find((slot) => slot.id === poll.value?.chosenSlotId),
	);
	const slotLabel = formatSlotLabel;

	const focusedParticipantId = ref<string | null>(null);
	const NO_VOTES: Record<string, VoteStatus> = {};

	const voteState: CalendarVoteState = {
		votes: computed(() => NO_VOTES),
		voters: computed(() =>
			Object.fromEntries(
				(poll.value?.slots ?? []).map((slot) => [slot.id, slot.voters]),
			),
		),
		bestSlotIds: computed(() => bestSlotIds(poll.value?.slots ?? [])),
		readonly: computed(() => true),
		focusedParticipantId,
		cycleVote: () => {},
		chosenSlotId: computed(() => poll.value?.chosenSlotId ?? null),
		picking: {
			selectedId,
			select: (id) => {
				haptic.trigger('light');
				selectedId.value = selectedId.value === id ? null : id;
				if (selectedId.value) intent.value = null;
			},
		},
	};

	const selectedSlot = computed(() =>
		draft.value.find((slot) => slot.id === selectedId.value),
	);

	const slotKey = (slots: CalendarTimeSlot[]) =>
		JSON.stringify(
			slots
				.map((slot) => [
					slot.id,
					slot.startDate,
					slot.endDate,
					slot.startTime,
					slot.endTime,
				])
				.sort(),
		);

	const slotsDirty = computed(
		() => slotKey(draft.value) !== slotKey(savedSlots.value),
	);

	const settings = computed<PollSettingsInput>(() => {
		if (!poll.value) return {};
		const result: PollSettingsInput = {};
		const nextTitle = title.value.trim();
		const nextDescription = description.value.trim();
		if (nextTitle !== poll.value.title) result.title = nextTitle;
		if (nextDescription !== (poll.value.description ?? ''))
			result.description = nextDescription || null;
		if (
			intent.value !== 'close' &&
			closingDate.value.compare(toCalendarDate(poll.value.closedAt)) !== 0
		)
			result.closedAt = closingDateToDate(
				closingDate.value,
			).toISOString();
		if (options.value.votePolicy !== poll.value.votePolicy)
			result.votePolicy = options.value.votePolicy;
		if (options.value.hideResults !== poll.value.hideResults)
			result.hideResults = options.value.hideResults;
		if (options.value.password) result.password = options.value.password;
		else if (dropPassword.value) result.password = null;
		if (intent.value === 'close') result.closedAt = 'now';
		if (intent.value === 'unchoose') result.chosenSlotId = null;
		if (selectedId.value) result.chosenSlotId = selectedId.value;
		return result;
	});

	const issue = computed(() => {
		const checks = [
			pollTitleSchema.safeParse(title.value),
			pollDescriptionSchema.safeParse(description.value),
			options.value.password
				? pollPasswordSchema.safeParse(options.value.password)
				: { success: true as const },
		];
		for (const check of checks)
			if (!check.success) return check.error.issues[0]!.message;
		return undefined;
	});

	const dirty = computed(
		() => Object.keys(settings.value).length > 0 || slotsDirty.value,
	);

	const summary = computed(() => {
		if (issue.value) return issue.value;
		const parts: string[] = [];
		if (selectedSlot.value)
			parts.push(`Retenir ${slotLabel(selectedSlot.value)}`);
		else if (intent.value === 'unchoose')
			parts.push('Annuler le créneau retenu');
		if (intent.value === 'close') parts.push('Clôturer maintenant');
		else if (settings.value.closedAt)
			parts.push('Nouvelle date de clôture');
		if (slotsDirty.value) parts.push('Créneaux modifiés');
		if (
			settings.value.title ||
			settings.value.description !== undefined ||
			settings.value.votePolicy ||
			settings.value.hideResults !== undefined ||
			settings.value.password !== undefined
		)
			parts.push('Détails modifiés');
		return parts.join(' · ') || 'Aucune modification';
	});

	const arm = (next: 'close' | 'unchoose') => {
		haptic.trigger('medium');
		intent.value = intent.value === next ? null : next;
		if (next === 'unchoose') selectedId.value = null;
	};

	const reopen = () => {
		haptic.trigger('medium');
		intent.value = intent.value === 'close' ? null : intent.value;
		const date = new Date();
		date.setDate(date.getDate() + 7);
		closingDate.value = new CalendarDate(
			date.getFullYear(),
			date.getMonth() + 1,
			date.getDate(),
		);
	};

	const calendar = useTemplateRef<{
		bestSlots: { length: number };
		bestIndex: number;
		revealNextBest: () => void;
	}>('calendar');

	const hasBest = computed(() => (calendar.value?.bestSlots.length ?? 0) > 0);

	const bestLabel = computed(() => {
		const count = calendar.value?.bestSlots.length ?? 0;
		if (count <= 1) return 'Meilleur créneau';
		const index = Math.max(calendar.value?.bestIndex ?? -1, 0);
		return `Meilleur créneau ${index + 1}/${count}`;
	});

	const revealBest = () => {
		haptic.trigger('medium');
		calendar.value?.revealNextBest();
	};

	const validateFields = () => {
		const errors: { name: string; message: string }[] = [];
		const titleCheck = pollTitleSchema.safeParse(title.value);
		if (!titleCheck.success)
			errors.push({
				name: 'title',
				message: titleCheck.error.issues[0]!.message,
			});
		const descriptionCheck = pollDescriptionSchema.safeParse(
			description.value,
		);
		if (!descriptionCheck.success)
			errors.push({
				name: 'description',
				message: descriptionCheck.error.issues[0]!.message,
			});
		return errors;
	};

	const { sizeXl } = useResponsiveButtonSize();
	const toast = useToast();
	const pending = shallowRef<
		null | 'settings' | 'status' | 'choose' | 'slots' | 'delete'
	>(null);

	const failed = (failure: unknown) => {
		const { data } = failure as { data?: { message?: string } };
		toast.add({
			title: 'Erreur',
			description: data?.message ?? 'Une erreur est survenue.',
			color: 'error',
		});
	};

	const heldSettings = shallowRef<PollSettingsInput | null>(null);

	const applySettings = async () => {
		const body = heldSettings.value;
		heldSettings.value = null;
		if (!body || Object.keys(body).length === 0) return;
		await $fetch(`/api/polls/${slug.value}`, {
			method: 'PATCH',
			body,
			headers: headers.value,
		});
	};

	// Slots edited in the calendar: a slot moved keeps its id, and so its votes
	const pendingSlots = shallowRef<CalendarTimeSlot[] | null>(null);
	const lostVotes = shallowRef(0);
	const confirmOpen = computed({
		get: () => pendingSlots.value !== null,
		set: (open) => {
			if (!open) pendingSlots.value = null;
		},
	});

	const slotsBody = (slots: CalendarTimeSlot[], dryRun: boolean) => {
		const known = new Set(poll.value?.slots.map((slot) => slot.id));
		return {
			dryRun,
			slots: slots.map((slot) => ({
				...(known.has(slot.id) ? { id: slot.id } : {}),
				...calendarSlotToApiSlot(slot),
			})),
		};
	};

	const putSlots = (slots: CalendarTimeSlot[], dryRun: boolean) =>
		$fetch<{ lostVotes: number }>(`/api/polls/${slug.value}/slots`, {
			method: 'PUT',
			body: slotsBody(slots, dryRun),
			headers: headers.value,
		});

	const applySlots = async (slots: CalendarTimeSlot[]) => {
		pending.value = 'slots';
		try {
			await putSlots(slots, false);
			pendingSlots.value = null;
			await applySettings();
			toast.add({
				title: 'Modifications enregistrées',
				color: 'success',
			});
			await refresh();
		} catch (failure) {
			failed(failure);
		} finally {
			pending.value = null;
		}
	};

	const saveSlots = async (slots: CalendarTimeSlot[]) => {
		pending.value = 'slots';
		try {
			const check = await putSlots(slots, true);
			if (check.lostVotes > 0) {
				lostVotes.value = check.lostVotes;
				pendingSlots.value = slots;
				pending.value = null;
				return;
			}
		} catch (failure) {
			pending.value = null;
			return failed(failure);
		}
		await applySlots(slots);
	};

	const save = async () => {
		if (!dirty.value || issue.value || pending.value) return;
		haptic.trigger('medium');
		heldSettings.value = { ...settings.value };
		if (slotsDirty.value) await saveSlots(draft.value);
		else {
			pending.value = 'settings';
			try {
				await applySettings();
				toast.add({
					title: 'Modifications enregistrées',
					color: 'success',
				});
				await refresh();
			} catch (failure) {
				failed(failure);
			} finally {
				pending.value = null;
			}
		}
	};

	const deleteCreno = async () => {
		pending.value = 'delete';
		try {
			await $fetch(`/api/polls/${slug.value}`, {
				method: 'DELETE',
				headers: headers.value,
			});
			removePoll(slug.value);
			toast.add({ title: 'Creno supprimé', color: 'success' });
			await navigateTo('/');
		} catch (failure) {
			failed(failure);
		} finally {
			pending.value = null;
		}
	};
</script>

<template>
	<UContainer class="mt-8 max-w-5xl space-y-8 pb-28 md:mt-12">
		<ClientOnly>
			<template v-if="!isOwner">
				<PollShareCard :url="publicUrl" title="ce Creno" />
				<p
					data-not-owner
					class="bg-elevated text-muted w-fit rounded-xl px-3 py-1.5 text-sm"
				>
					Ce Creno n’a pas été créé depuis ce navigateur : seul le
					partage est disponible ici.
				</p>
			</template>

			<UEmpty
				v-else-if="isNotFound"
				icon="i-lucide-calendar-x"
				title="Ce Creno est introuvable"
				description="Le lien est peut-être incomplet, ou le Creno n’existe plus."
				:actions="[
					{ label: 'Retour à l’accueil', to: '/', color: 'neutral' },
				]"
			/>

			<UEmpty
				v-else-if="isForbidden"
				icon="i-lucide-key-round"
				title="Ce lien d’administration n’est plus valide"
				description="Seul le lien reçu à la création donne accès à l’administration."
				:actions="[
					{ label: 'Retour à l’accueil', to: '/', color: 'neutral' },
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
				<UForm
					:state="{ title, description }"
					:validate="validateFields"
					class="space-y-2"
				>
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
				</UForm>

				<PollClosingField v-model="closingDate" :min-date="minDate" />

				<PollAdminStatus
					:closed="isClosed"
					:closed-at="intent === 'close' ? new Date() : poll.closedAt"
					:chosen-label="chosenSlot ? slotLabel(chosenSlot) : null"
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
					<PollAdminLinkCard v-if="adminUrl" :url="adminUrl" />
				</div>

				<section class="space-y-3">
					<p class="text-muted text-sm">
						Cliquez un créneau pour le retenir. Déplacez-le pour
						garder ses réponses, la croix le retire.
						<template v-if="poll.hideResults">
							Vous voyez déjà les réponses. Les participants ne
							les voient qu’après avoir répondu, ou une fois le
							sondage terminé.
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

					<PollParticipants
						v-model="focusedParticipantId"
						:participants="poll.participants"
					/>
				</section>

				<PollAdvancedOptions
					v-model="options"
					v-model:snap-minutes="snapMinutes"
					v-model:click-slot-duration="clickSlotDuration"
					:password-set="poll.hasPassword && !dropPassword"
					@remove-password="dropPassword = true"
				/>

				<PollDeleteCard
					:title="poll.title"
					:pending="pending === 'delete'"
					@confirm="deleteCreno"
				/>

				<UModal
					v-model:open="confirmOpen"
					title="Des réponses vont être perdues"
					:description="`Les créneaux retirés emportent ${lostVotes} réponse${lostVotes > 1 ? 's' : ''}. Les créneaux déplacés gardent les leurs.`"
				>
					<template #footer>
						<div class="flex w-full justify-end gap-2">
							<UButton
								label="Annuler"
								color="neutral"
								variant="ghost"
								@click="confirmOpen = false"
							/>
							<UButton
								label="Enregistrer quand même"
								color="error"
								:loading="pending === 'slots'"
								data-confirm-slots
								@click="
									pendingSlots && applySlots(pendingSlots)
								"
							/>
						</div>
					</template>
				</UModal>

				<div v-if="dirty || hasBest" class="sticky bottom-4 z-40">
					<div
						class="bg-elevated/85 ring-default flex flex-col gap-1.5 rounded-xl p-1.5 shadow-lg ring backdrop-blur sm:flex-row sm:items-center sm:justify-between"
					>
						<p
							class="bg-default rounded-lg px-3 py-1.5 text-sm tabular-nums"
							:class="issue ? 'text-error' : 'text-highlighted'"
						>
							{{ summary }}
						</p>
						<div
							class="flex flex-wrap items-center justify-end gap-1.5"
						>
							<UTooltip
								v-if="hasBest"
								text="Aller au créneau le plus demandé"
								:kbds="['B']"
							>
								<UButton
									data-best-button
									type="button"
									variant="soft"
									color="neutral"
									icon="i-lucide-star"
									:size="sizeXl"
									class="press"
									:label="bestLabel"
									@click="revealBest"
								/>
							</UTooltip>
							<UButton
								v-if="dirty"
								data-admin-cancel
								label="Annuler"
								color="neutral"
								variant="ghost"
								:size="sizeXl"
								@click="resetDraft"
							/>
							<UButton
								v-if="dirty"
								data-admin-save
								label="Enregistrer"
								icon="i-lucide-check"
								color="neutral"
								:size="sizeXl"
								:loading="
									pending === 'settings' ||
									pending === 'slots'
								"
								:disabled="!!issue || !!pending"
								class="press"
								@click="save"
							/>
						</div>
					</div>
				</div>
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
		</ClientOnly>
	</UContainer>
</template>
