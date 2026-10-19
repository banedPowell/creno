<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import { CalendarDate } from '@internationalized/date';
	import type { FormError } from '@nuxt/ui';
	import type { CalendarTimeSlot } from '~/types/calendar';
	import {
		DEFAULT_POLL_OPTIONS,
		pollPasswordSchema,
		type PollOptions,
	} from '#shared/utils/pollSettings';

	const haptic = useWebHaptics();
	const sidebarOpen = ref(true);

	const state = reactive({ title: '', description: '' });
	const options = ref<PollOptions>({ ...DEFAULT_POLL_OPTIONS });
	const snapMinutes = ref(30);
	const clickSlotDuration = ref(120);

	const passwordIssue = computed(() => {
		if (!options.value.password) return undefined;
		const parsed = pollPasswordSchema.safeParse(options.value.password);
		return parsed.success ? undefined : parsed.error.issues[0]!.message;
	});

	const calendarSlots = ref<CalendarTimeSlot[]>([]);

	const today = new Date();
	const minDate = new CalendarDate(
		today.getFullYear(),
		today.getMonth() + 1,
		today.getDate(),
	);
	const date = shallowRef(minDate.add({ days: 7 }));

	function calendarDateToDate(cal: CalendarDate): Date {
		return new Date(cal.year, cal.month - 1, cal.day);
	}

	// Everything sent goes through this one check, the form only displays it
	const now = useNow({ interval: 60_000 });
	const result = computed(() =>
		buildPollPayload(
			{
				title: state.title,
				description: state.description,
				closingDate: date.value,
				slots: calendarSlots.value,
			},
			now.value,
		),
	);

	const isValid = computed(
		() => result.value.success && !passwordIssue.value,
	);

	const validate = (): FormError[] => [
		...(result.value.success
			? []
			: result.value.issues.map(({ path, message }) => ({
					name: path,
					message,
				}))),
		...(passwordIssue.value
			? [{ name: 'password', message: passwordIssue.value }]
			: []),
	];

	// What the action bar says: the first thing to fix, or what will be sent
	const summary = computed(() => {
		if (!result.value.success) return result.value.issues[0]!.message;
		if (passwordIssue.value) return passwordIssue.value;
		const count = result.value.data.slots.length;
		return `${count} créneau${count > 1 ? 'x' : ''} · clôture le ${formatDayMonth(calendarDateToDate(date.value))}`;
	});

	const { sizeXl } = useResponsiveButtonSize();

	const toast = useToast();
	const { savePoll } = useOwnedPolls();
	const submitBody = ref<Record<string, unknown>>({});

	const { data, execute, pending, error } = await useFetch(
		'/api/polls/create',
		{
			method: 'POST',
			body: submitBody,
			immediate: false,
			watch: [],
		},
	);

	async function onSubmit() {
		if (!isValid.value || !result.value.success) return;
		const { password, ...settings } = options.value;
		submitBody.value = {
			...result.value.data,
			...settings,
			...(password ? { password } : {}),
		};
		await execute();
		if (error.value) {
			const msg = (error.value.data as { message?: string })?.message;
			toast.add({
				title: 'Erreur',
				description: msg ?? 'Une erreur est survenue.',
				color: 'error',
			});
		} else if (data.value?.slug && data.value.adminToken) {
			const { slug, adminToken, title } = data.value;
			savePoll(slug, { adminToken, title });
			toast.add({ title: 'Creno lancé avec succès', color: 'success' });
			await navigateTo(`/poll/${slug}/admin`);
		}
	}
</script>

<template>
	<UForm
		:state="state"
		:validate="validate"
		class="flex min-h-[calc(100svh-var(--ui-header-height))] min-w-0 flex-1"
		@submit="onSubmit"
	>
		<USidebar
			v-model:open="sidebarOpen"
			collapsible="offcanvas"
			mode="slideover"
			:style="{ '--sidebar-width': '20rem' }"
			:ui="{
				gap: 'h-[calc(100%-var(--ui-header-height))]',
				container:
					'top-(--ui-header-height) h-[calc(100%-var(--ui-header-height))]',
			}"
		>
			<div class="flex flex-col gap-6">
				<UFormField name="closedAt">
					<PollClosingField v-model="date" :min-date="minDate" />
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
				/>
			</div>
		</USidebar>

		<div class="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
			<UButton
				icon="i-lucide-panel-left"
				color="neutral"
				variant="ghost"
				aria-label="Afficher les réglages"
				class="w-fit lg:hidden"
				@click="sidebarOpen = !sidebarOpen"
			/>

			<h1 class="sr-only">Lancer un Creno</h1>

			<div>
				<UFormField name="title">
					<UInput
						v-model="state.title"
						variant="none"
						size="xl"
						aria-label="Titre du Creno"
						placeholder="Réunion d'équipe"
						class="w-full"
						:ui="{
							base: 'text-highlighted placeholder:text-dimmed px-0 text-3xl font-bold aria-invalid:rounded-none aria-invalid:border-b-2 aria-invalid:border-error aria-invalid:ring-0 md:text-4xl',
						}"
					/>
				</UFormField>

				<UFormField name="description">
					<UTextarea
						v-model="state.description"
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

			<UFormField name="slots">
				<PollCalendar
					v-model="calendarSlots"
					:snap-minutes="snapMinutes"
					:click-slot-duration="clickSlotDuration"
				/>
			</UFormField>

			<div class="sticky bottom-4 z-40">
				<div
					class="bg-elevated/85 ring-default flex flex-col gap-1.5 rounded-xl p-1.5 shadow-lg ring backdrop-blur sm:flex-row sm:items-center sm:justify-between"
				>
					<p
						class="bg-default rounded-lg px-3 py-1.5 text-sm tabular-nums"
						:class="isValid ? 'text-highlighted' : 'text-muted'"
					>
						{{ summary }}
					</p>

					<UButton
						type="submit"
						label="Lancer le Creno"
						trailing-icon="i-lucide-arrow-right"
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
		</div>
	</UForm>
</template>
