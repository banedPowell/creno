<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import { CalendarDate } from '@internationalized/date';
	import type { DateDuration } from '@internationalized/date';
	import type { FormError } from '@nuxt/ui';
	import type { CalendarTimeSlot } from '~/types/calendar';

	const haptic = useWebHaptics();

	const state = reactive({ title: '', description: '' });

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

	const isValid = computed(() => result.value.success);

	const validate = (): FormError[] =>
		result.value.success
			? []
			: result.value.issues.map(({ path, message }) => ({
					name: path,
					message,
				}));

	const addDay = () => {
		date.value = date.value.add({ days: 1 });
	};

	const removeDay = () => {
		if (date.value.compare(minDate) > 0) {
			date.value = date.value.subtract({ days: 1 });
		}
	};

	const isAtMinDate = computed(() => date.value.compare(minDate) <= 0);

	const closingPresets: { label: string; duration: DateDuration }[] = [
		{ label: '+1 sem.', duration: { weeks: 1 } },
		{ label: '+2 sem.', duration: { weeks: 2 } },
		{ label: '+1 mois', duration: { months: 1 } },
	];

	const isPresetActive = (duration: DateDuration) =>
		date.value.compare(minDate.add(duration)) === 0;

	const closingHint = computed(() => {
		const days = date.value.compare(minDate);
		const relative =
			days === 0
				? "aujourd'hui"
				: days === 1
					? 'demain'
					: `dans ${days} jours`;
		return `Les votes ferment le ${formatFullDate(calendarDateToDate(date.value))}, ${relative}.`;
	});

	// What the action bar says: the first thing to fix, or what will be sent
	const summary = computed(() => {
		if (!result.value.success) return result.value.issues[0]!.message;
		const count = result.value.data.slots.length;
		return `${count} créneau${count > 1 ? 'x' : ''} · clôture le ${formatDayMonth(calendarDateToDate(date.value))}`;
	});

	const { sizeMd, sizeXl } = useResponsiveButtonSize();

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
		if (!result.value.success) return;
		submitBody.value = result.value.data;
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
	<UContainer class="mt-8 max-w-5xl pb-28 md:mt-12">
		<h1 class="sr-only">Lancer un Creno</h1>

		<UForm
			:state="state"
			:validate="validate"
			class="space-y-6"
			@submit="onSubmit"
		>
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
							base: 'text-highlighted placeholder:text-dimmed px-0 text-3xl font-bold md:text-4xl',
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
							base: 'text-muted placeholder:text-dimmed resize-none px-0 text-base',
						}"
					/>
				</UFormField>
			</div>

			<UFormField name="closedAt">
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-muted text-sm">Clôture</span>

					<div
						class="bg-elevated flex w-fit flex-wrap items-center gap-2 rounded-xl p-1.5"
					>
						<div class="flex items-center gap-0.5">
							<UButton
								icon="i-lucide-minus"
								variant="ghost"
								color="neutral"
								:size="sizeMd"
								:disabled="isAtMinDate"
								class="hover:bg-accented"
								aria-label="Un jour plus tôt"
								@click="
									() => {
										haptic.trigger('light');
										removeDay();
									}
								"
							/>

							<UTooltip :text="closingHint">
								<UInputDate
									v-model="date"
									variant="none"
									:size="sizeMd"
									:hour-cycle="24"
									:min-value="minDate"
									class="bg-elevated rounded-lg"
								>
									<template #trailing>
										<UPopover>
											<UButton
												color="neutral"
												variant="link"
												icon="i-lucide-calendar"
												aria-label="Choisir une date"
												class="px-0"
												@click="haptic.trigger('light')"
											/>

											<template #content>
												<UCalendar
													v-model="date"
													class="p-4"
													:min-value="minDate"
													variant="subtle"
													:size="sizeXl"
													@update:model-value="
														haptic.trigger('light')
													"
												/>
											</template>
										</UPopover>
									</template>
								</UInputDate>
							</UTooltip>

							<UButton
								icon="i-lucide-plus"
								variant="ghost"
								color="neutral"
								:size="sizeMd"
								class="hover:bg-accented"
								aria-label="Un jour plus tard"
								@click="
									() => {
										haptic.trigger('light');
										addDay();
									}
								"
							/>
						</div>

						<div class="flex items-center gap-0.5">
							<UButton
								v-for="preset in closingPresets"
								:key="preset.label"
								:label="preset.label"
								color="neutral"
								:variant="
									isPresetActive(preset.duration)
										? 'soft'
										: 'ghost'
								"
								:size="sizeMd"
								:class="
									isPresetActive(preset.duration)
										? 'bg-accented'
										: 'text-muted hover:bg-accented'
								"
								@click="
									() => {
										haptic.trigger('light');
										date = minDate.add(preset.duration);
									}
								"
							/>
						</div>
					</div>
				</div>
			</UFormField>

			<UFormField name="slots">
				<PollCalendar v-model="calendarSlots" />
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
		</UForm>
	</UContainer>
</template>
