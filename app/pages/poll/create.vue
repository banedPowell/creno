<script setup lang="ts">
	import { z } from 'zod';
	import { CalendarDate } from '@internationalized/date';

	const schema = z.object({
		title: z.string('Title is required'),
		description: z.string('Description is required'),
		closedAt: z.date('Closing date is required'),
		slots: z.array(
			z.object({
				startTime: z.date('Start time is required'),
				duration: z.number('Duration is required'),
			}),
		),
	});

	type Schema = z.output<typeof schema>;

	const state = reactive<Partial<Schema>>({
		title: undefined,
		description: undefined,
		closedAt: undefined,
		slots: [],
	});

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
</script>

<template>
	<UContainer class="mt-10 max-w-3xl">
		<UForm :state="state" :schema="schema" class="space-y-6">
			<div class="flex flex-col justify-between gap-4 md:flex-row">
				<h1 class="text-3xl font-bold">Lancer un Creno</h1>

				<UFormField label="Fermeture le">
					<UFieldGroup size="sm">
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
											class="p-4"
											v-model="date"
											:min-value="minDate"
											variant="subtle"
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
				<UFormField label="Titre du Creno" required size="lg">
					<UInput v-model="state.title" class="w-full" />
				</UFormField>

				<UFormField label="Description du Creno" size="lg">
					<UTextarea v-model="state.description" class="w-full" />
				</UFormField>
			</div>

			<div class="space-y-4">
				<UFormField label="Définir des créneaux" required size="lg">
				</UFormField>
			</div>

			<UButton
				type="submit"
				label="Lancer le Creno"
				icon="lucide-rocket"
			/>
		</UForm>
	</UContainer>
</template>
