<script setup lang="ts">
	const { navigation } = useCalendarContext();
	const { sizeMd } = useResponsiveButtonSize();
</script>

<template>
	<div class="mb-4 flex items-end justify-between gap-2">
		<div
			class="flex flex-col-reverse flex-wrap items-center gap-2 md:flex-row"
		>
			<div
				class="dark:bg-old-neutral-900 flex items-center gap-2 rounded-xl bg-neutral-100 p-1.5"
			>
				<div class="flex items-center gap-0.5">
					<UButton
						icon="i-lucide-chevrons-left"
						variant="ghost"
						color="neutral"
						:disabled="!navigation.canGoPrevBigPeriod.value"
						:size="sizeMd"
						class="light:hover:bg-neutral-200"
						@click="navigation.prevBigPeriod"
					/>
					<UButton
						icon="i-lucide-chevron-left"
						variant="ghost"
						color="neutral"
						:disabled="!navigation.canGoPrevPeriod.value"
						:size="sizeMd"
						class="light:hover:bg-neutral-200"
						@click="navigation.prevPeriod"
					/>
				</div>

				<UButton
					variant="soft"
					:size="sizeMd"
					label="Aujourd'hui"
					@click="navigation.goToday"
				/>

				<div class="flex items-center gap-0.5">
					<UButton
						icon="i-lucide-chevron-right"
						variant="ghost"
						color="neutral"
						:size="sizeMd"
						class="light:hover:bg-neutral-200"
						@click="navigation.nextPeriod"
					/>
					<UButton
						icon="i-lucide-chevrons-right"
						variant="ghost"
						color="neutral"
						:size="sizeMd"
						class="light:hover:bg-neutral-200"
						@click="navigation.nextBigPeriod"
					/>
				</div>
			</div>

			<span
				class="text-xs font-medium text-neutral-600 select-none dark:text-neutral-400"
			>
				{{ navigation.dateRangeLabel.value }}
			</span>
		</div>

		<div class="flex items-center gap-4">
			<div
				class="dark:bg-old-neutral-900 flex items-center gap-1 rounded-xl bg-neutral-100 p-1.5"
			>
				<UTooltip text="Vue jour par jour">
					<UButton
						:variant="
							navigation.view.value === 'day' ? 'solid' : 'ghost'
						"
						color="neutral"
						icon="lucide-calendar-1"
						:size="sizeMd"
						:class="
							navigation.view.value === 'day'
								? 'hover:brightness-120'
								: 'light:hover:bg-neutral-200'
						"
						@click="navigation.view.value = 'day'"
					/>
				</UTooltip>

				<UTooltip text="Vue semaine par semaine">
					<UButton
						:variant="
							navigation.view.value === 'week' ? 'solid' : 'ghost'
						"
						color="neutral"
						icon="lucide-columns-2"
						:size="sizeMd"
						:class="
							navigation.view.value === 'week'
								? 'hover:brightness-120'
								: 'light:hover:bg-neutral-200'
						"
						@click="navigation.view.value = 'week'"
					/>
				</UTooltip>
			</div>
		</div>
	</div>
</template>
