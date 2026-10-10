<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	const { calendar } = useCalendarContext();
	const { sizeMd } = useResponsiveButtonSize();
	const haptic = useWebHaptics();
</script>

<template>
	<div class="mb-4 flex items-end justify-between gap-2">
		<div
			class="flex flex-col-reverse flex-wrap items-center gap-2 md:flex-row"
		>
			<div class="bg-elevated flex items-center gap-2 rounded-xl p-1.5">
				<div class="flex items-center gap-0.5">
					<UTooltip
						text="Période précédente longue"
						:kbds="['shift', 'arrowleft']"
					>
						<UButton
							icon="i-lucide-chevrons-left"
							variant="ghost"
							color="neutral"
							:disabled="!calendar.canGoPrevBigPeriod.value"
							:size="sizeMd"
							class="hover:bg-accented"
							@click="
								() => {
									haptic.trigger('light');
									calendar.prevBigPeriod();
								}
							"
						/>
					</UTooltip>
					<UTooltip text="Période précédente" :kbds="['arrowleft']">
						<UButton
							icon="i-lucide-chevron-left"
							variant="ghost"
							color="neutral"
							:disabled="!calendar.canGoPrevPeriod.value"
							:size="sizeMd"
							class="hover:bg-accented"
							@click="
								() => {
									haptic.trigger('light');
									calendar.prevPeriod();
								}
							"
						/>
					</UTooltip>
				</div>

				<UTooltip text="Revenir à aujourd'hui" :kbds="['T']">
					<UButton
						variant="soft"
						:size="sizeMd"
						class="press"
						label="Aujourd'hui"
						@click="
							() => {
								haptic.trigger('medium');
								calendar.goToday();
							}
						"
					/>
				</UTooltip>

				<div class="flex items-center gap-0.5">
					<UTooltip text="Période suivante" :kbds="['arrowright']">
						<UButton
							icon="i-lucide-chevron-right"
							variant="ghost"
							color="neutral"
							:size="sizeMd"
							class="hover:bg-accented"
							@click="
								() => {
									haptic.trigger('light');
									calendar.nextPeriod();
								}
							"
						/>
					</UTooltip>
					<UTooltip
						text="Période suivante longue"
						:kbds="['shift', 'arrowright']"
					>
						<UButton
							icon="i-lucide-chevrons-right"
							variant="ghost"
							color="neutral"
							:size="sizeMd"
							class="hover:bg-accented"
							@click="
								() => {
									haptic.trigger('light');
									calendar.nextBigPeriod();
								}
							"
						/>
					</UTooltip>
				</div>
			</div>

			<span
				class="text-muted text-xs font-medium select-none first-letter:uppercase"
			>
				{{ calendar.periodLabel.value }}
			</span>
		</div>

		<div class="flex items-center gap-4">
			<div class="bg-elevated flex items-center gap-1 rounded-xl p-1.5">
				<UTooltip text="Vue jour par jour" :kbds="['D']">
					<UButton
						:variant="
							calendar.view.value === 'day' ? 'solid' : 'ghost'
						"
						color="neutral"
						icon="lucide-calendar-1"
						:size="sizeMd"
						:class="
							calendar.view.value === 'day'
								? 'press hover:brightness-120'
								: 'hover:bg-accented'
						"
						@click="
							() => {
								haptic.trigger('light');
								calendar.view.value = 'day';
							}
						"
					/>
				</UTooltip>

				<UTooltip text="Vue semaine par semaine" :kbds="['W']">
					<UButton
						:variant="
							calendar.view.value === 'week' ? 'solid' : 'ghost'
						"
						color="neutral"
						icon="lucide-columns-2"
						:size="sizeMd"
						:class="
							calendar.view.value === 'week'
								? 'press hover:brightness-120'
								: 'hover:bg-accented'
						"
						@click="
							() => {
								haptic.trigger('light');
								calendar.view.value = 'week';
							}
						"
					/>
				</UTooltip>

				<UTooltip text="Vue mois par mois" :kbds="['M']">
					<UButton
						:variant="
							calendar.view.value === 'month' ? 'solid' : 'ghost'
						"
						color="neutral"
						icon="lucide-calendar-days"
						:size="sizeMd"
						:class="
							calendar.view.value === 'month'
								? 'press hover:brightness-120'
								: 'hover:bg-accented'
						"
						@click="
							() => {
								haptic.trigger('light');
								calendar.view.value = 'month';
							}
						"
					/>
				</UTooltip>
			</div>
		</div>
	</div>
</template>
