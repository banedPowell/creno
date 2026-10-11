<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import type { CalendarDate, DateDuration } from '@internationalized/date';

	const date = defineModel<CalendarDate>({ required: true });

	const props = defineProps<{ minDate: CalendarDate }>();

	const haptic = useWebHaptics();
	const { sizeMd, sizeXl } = useResponsiveButtonSize();

	const addDay = () => {
		date.value = date.value.add({ days: 1 });
	};

	const removeDay = () => {
		if (date.value.compare(props.minDate) > 0)
			date.value = date.value.subtract({ days: 1 });
	};

	const isAtMinDate = computed(() => date.value.compare(props.minDate) <= 0);

	const closingPresets: { label: string; duration: DateDuration }[] = [
		{ label: '+1 sem.', duration: { weeks: 1 } },
		{ label: '+2 sem.', duration: { weeks: 2 } },
		{ label: '+1 mois', duration: { months: 1 } },
	];

	const isPresetActive = (duration: DateDuration) =>
		date.value.compare(props.minDate.add(duration)) === 0;

	const closingHint = computed(() => {
		const days = date.value.compare(props.minDate);
		const relative =
			days === 0
				? "aujourd'hui"
				: days === 1
					? 'demain'
					: `dans ${days} jours`;
		return `Les votes ferment le ${formatFullDate(new Date(date.value.year, date.value.month - 1, date.value.day))}, ${relative}.`;
	});
</script>

<template>
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
						data-details-closing
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
						isPresetActive(preset.duration) ? 'soft' : 'ghost'
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
</template>
