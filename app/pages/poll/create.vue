<script setup lang="ts">
	import { z } from 'zod';
	import { CalendarDate } from '@internationalized/date';
	import type { CalendarTimeSlot } from '~/types/calendar';

	const schema = z.object({
		title: z
			.string()
			.min(
				2,
				'Le titre est requis et doit contenir au moins 2 caractères',
			),
		description: z.string().optional(),
		closedAt: z.date(),
		slots: z
			.array(z.object({ start: z.string(), end: z.string() }))
			.min(1, 'Au moins un créneau est requis'),
	});

	type Schema = z.output<typeof schema>;

	const state = reactive<Partial<Schema>>({
		title: undefined,
		description: undefined,
		closedAt: undefined,
		slots: [],
	});

	const isValid = computed(() => schema.safeParse(state).success);

	const calendarSlots = ref<CalendarTimeSlot[]>([]);
	watch(
		calendarSlots,
		(slots) => {
			state.slots = slots.map(calendarSlotToApiSlot);
		},
		{ immediate: true, deep: true },
	);

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

	watch(
		date,
		(cal) => {
			state.closedAt = cal ? calendarDateToDate(cal) : undefined;
		},
		{ immediate: true },
	);

	const addDay = () => {
		date.value = date.value.add({ days: 1 });
	};

	const removeDay = () => {
		if (date.value.compare(minDate) > 0) {
			date.value = date.value.subtract({ days: 1 });
		}
	};

	const isAtMinDate = computed(() => date.value.compare(minDate) <= 0);

	const { sizeMd, sizeXl } = useResponsiveButtonSize();

	const toast = useToast();
	const submitBody = ref<Record<string, unknown>>({});

	const { execute, pending, error } = await useFetch('/api/polls/create', {
		method: 'POST',
		body: submitBody,
		immediate: false,
		watch: [],
	});

	async function onSubmit() {
		const parsed = schema.safeParse(state);
		if (!parsed.success) return;
		const { title, description, closedAt, slots } = parsed.data;
		submitBody.value = {
			title,
			description: description ?? undefined,
			closedAt: closedAt.toISOString(),
			slots,
		};
		await execute();
		if (error.value) {
			const msg = (error.value.data as { message?: string })?.message;
			toast.add({
				title: 'Erreur',
				description: msg ?? 'Une erreur est survenue.',
				color: 'error',
			});
		} else {
			toast.add({ title: 'Creno lancé avec succès', color: 'success' });
		}
	}
</script>

<template>
	<UContainer class="mt-10 max-w-5xl">
		<UForm
			:state="state"
			:schema="schema"
			class="space-y-6"
			@submit="onSubmit"
		>
			<div class="flex flex-col justify-between gap-4 md:flex-row">
				<h1 class="text-3xl font-bold">Lancer un Creno</h1>

				<UFormField label="Fermeture le" name="closedAt">
					<UFieldGroup :size="sizeMd">
						<UButton
							icon="lucide-minus"
							variant="subtle"
							color="neutral"
							:disabled="isAtMinDate"
							@click="removeDay"
						/>

						<UInputDate
							v-model="date"
							variant="subtle"
							:hour-cycle="24"
							:min-value="minDate"
						>
							<template #trailing>
								<UPopover>
									<UButton
										color="neutral"
										variant="link"
										icon="i-lucide-calendar"
										aria-label="Select a date"
										class="px-0"
									/>

									<template #content>
										<UCalendar
											v-model="date"
											class="p-4"
											:min-value="minDate"
											variant="subtle"
											:size="sizeXl"
										/>
									</template>
								</UPopover>
							</template>
						</UInputDate>

						<UButton
							icon="lucide-plus"
							variant="subtle"
							color="neutral"
							@click="addDay"
						/>
					</UFieldGroup>
				</UFormField>
			</div>

			<div class="space-y-4">
				<UFormField
					label="Titre du Creno"
					required
					size="lg"
					name="title"
				>
					<UInput
						v-model="state.title"
						class="w-full"
						placeholder="Réunion d'équipe"
					/>
				</UFormField>

				<UFormField
					label="Description du Creno"
					size="lg"
					name="description"
				>
					<UTextarea
						v-model="state.description"
						class="w-full"
						placeholder="Trouvons un créneau pour notre prochaine réunion"
					/>
				</UFormField>
			</div>

			<div class="space-y-4">
				<UFormField
					label="Définir des créneaux"
					required
					size="lg"
					name="slots"
				>
					<PollCalendar v-model="calendarSlots" />
				</UFormField>
			</div>

			<UButton
				type="submit"
				label="Lancer le Creno"
				icon="lucide-rocket"
				:loading="pending"
				:disabled="pending || !isValid"
				variant="solid"
				:size="sizeXl"
				color="primary"
				class="w-full justify-center md:w-fit"
			/>
		</UForm>
	</UContainer>
</template>
