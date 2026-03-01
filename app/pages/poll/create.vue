<script setup lang="ts">
	import { CalendarDate } from '@internationalized/date';

	const form = ref({
		title: '',
		description: '',
		closedAt: '',
	});

	const handleSubmit = (e: Event) => {
		e.preventDefault();
	};

	const slots = ref([
		{
			startTime: '',
			duration: 0,
		},
	]);

	const today = new Date();
	const minDate = new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
	const date = shallowRef(minDate.add({ days: 3 }));

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
		<h1 class="text-2xl font-bold">Lancer un creno</h1>

		<UForm class="w-full space-y-4">
			<UFormField label="Date de fermeture">
				<div class="flex flex-row gap-2">
					<UFieldGroup>
						<UButton
							icon="lucide-minus"
							label="1 jour"
							variant="subtle"
							color="neutral"
							:disabled="isAtMinDate"
							@click="removeDay"
						/>

						<UInputDate
							variant="subtle"
							:hour-cycle="24"
							v-model="date"
							:min-value="minDate"
						>
							<template #trailing>
								<UPopover>
									<UButton
										color="neutral"
										variant="link"
										size="sm"
										icon="i-lucide-calendar"
										aria-label="Select a date"
										class="px-0"
									/>

									<template #content>
										<UCalendar
											class="p-2"
											variant="subtle"
										/>
									</template>
								</UPopover>
							</template>
						</UInputDate>

						<UButton
							icon="lucide-plus"
							label="1 jour"
							variant="subtle"
							color="neutral"
							@click="addDay"
						/>
					</UFieldGroup>
				</div>
			</UFormField>

			<UFormField label="Titre du creno">
				<UInput v-model="form.title" class="w-full" />
			</UFormField>

			<UFormField label="Description du creno">
				<UTextarea v-model="form.description" class="w-full" />
			</UFormField>
		</UForm>
	</UContainer>
</template>
