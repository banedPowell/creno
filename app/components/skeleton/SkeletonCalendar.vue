<script setup lang="ts">
	import { HOUR_HEIGHT } from '~/utils/calendarLayout';

	// Enough hours to fill the frame, wherever the real grid opens
	const hours = Array.from({ length: 12 }, (_, index) => index + 1);
</script>

<template>
	<div class="select-none" aria-hidden="true" data-skeleton-calendar>
		<div
			class="mb-4 flex flex-col-reverse items-start justify-between gap-2 md:flex-row"
		>
			<div
				class="flex flex-col-reverse flex-wrap items-center gap-2 md:flex-row"
			>
				<div
					class="bg-elevated flex items-center gap-2 rounded-xl p-1.5"
				>
					<div class="flex items-center gap-0.5">
						<USkeleton class="size-8 rounded-md md:size-7" />
						<USkeleton class="size-8 rounded-md md:size-7" />
					</div>
					<USkeleton class="h-8 w-24 rounded-md md:h-7 md:w-20" />
					<div class="flex items-center gap-0.5">
						<USkeleton class="size-8 rounded-md md:size-7" />
						<USkeleton class="size-8 rounded-md md:size-7" />
					</div>
				</div>
				<USkeleton class="h-3 w-28" />
			</div>

			<div class="bg-elevated flex items-center gap-1 rounded-xl p-1.5">
				<USkeleton
					v-for="view in 3"
					:key="view"
					class="size-8 rounded-md md:size-7"
				/>
			</div>
		</div>

		<div class="border-default h-[80dvh] overflow-hidden rounded-lg border">
			<div class="min-w-175">
				<div
					class="border-default grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b"
				>
					<div />
					<div
						v-for="day in 7"
						:key="day"
						class="border-default flex h-10 items-center justify-center border-l"
					>
						<USkeleton class="h-4 w-12" />
					</div>
				</div>

				<div class="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
					<div class="relative">
						<USkeleton
							v-for="hour in hours"
							:key="hour"
							class="absolute right-2 h-2.5 w-8 -translate-y-1/2"
							:style="{ top: `${hour * HOUR_HEIGHT}px` }"
						/>
					</div>
					<div
						v-for="day in 7"
						:key="day"
						class="border-default border-l"
						:style="{
							height: `${(hours.length + 1) * HOUR_HEIGHT}px`,
						}"
					/>
				</div>
			</div>
		</div>
	</div>
</template>
