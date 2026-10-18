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

	const asDate = computed(
		() => new Date(date.value.year, date.value.month - 1, date.value.day),
	);

	const shortDateLabel = computed(
		() => `${formatDayMonth(asDate.value)} ${date.value.year}`,
	);

	const closingHint = computed(() => {
		const days = date.value.compare(props.minDate);
		const relative =
			days === 0
				? "aujourd'hui"
				: days === 1
					? 'demain'
					: `dans ${days} jours`;
		return `Les votes ferment le ${formatFullDate(asDate.value)}, ${relative}.`;
	});
</script>

<template>
	<div class="flex w-full flex-col gap-2">
		<div class="flex items-center gap-1">
			<span class="text-muted text-sm">Clôture</span>
			<UTooltip
				:text="closingHint"
				:ui="{
					content: 'h-auto max-w-56 items-start py-1.5',
					text: 'overflow-visible whitespace-normal text-clip',
				}"
			>
				<button
					type="button"
					class="text-muted hover:text-default"
					aria-label="Détail de la clôture"
				>
					<UIcon name="i-lucide-circle-help" class="size-3.5" />
				</button>
			</UTooltip>
		</div>

		<div class="bg-elevated flex w-full flex-col gap-1 rounded-xl p-1.5">
			<UPopover>
				<UButton
					color="neutral"
					variant="ghost"
					trailing-icon="i-lucide-calendar"
					:label="shortDateLabel"
					:size="sizeMd"
					class="hover:bg-accented w-full justify-between"
					aria-label="Choisir une date"
					data-details-closing
					@click="haptic.trigger('light')"
				/>

				<template #content>
					<UCalendar
						v-model="date"
						class="p-4"
						:min-value="minDate"
						variant="subtle"
						:size="sizeXl"
						@update:model-value="haptic.trigger('light')"
					/>
				</template>
			</UPopover>

			<div class="grid grid-cols-2 gap-0.5">
				<UButton
					icon="i-lucide-minus"
					variant="ghost"
					color="neutral"
					:size="sizeMd"
					:disabled="isAtMinDate"
					class="hover:bg-accented w-full justify-center"
					aria-label="Un jour plus tôt"
					@click="
						() => {
							haptic.trigger('light');
							removeDay();
						}
					"
				/>
				<UButton
					icon="i-lucide-plus"
					variant="ghost"
					color="neutral"
					:size="sizeMd"
					class="hover:bg-accented w-full justify-center"
					aria-label="Un jour plus tard"
					@click="
						() => {
							haptic.trigger('light');
							addDay();
						}
					"
				/>
			</div>

			<div class="grid grid-cols-3">
				<UButton
					v-for="preset in closingPresets"
					:key="preset.label"
					:label="preset.label"
					color="neutral"
					:variant="
						isPresetActive(preset.duration) ? 'soft' : 'ghost'
					"
					:size="sizeMd"
					class="w-full justify-center px-1"
					:ui="{ label: 'truncate-none' }"
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
