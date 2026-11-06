<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import type { CalendarDate } from '@internationalized/date';

	const date = defineModel<CalendarDate>({ required: true });

	defineProps<{
		closed: boolean;
		closedAt: string | Date;
		minDate: CalendarDate;
		pending?: boolean;
	}>();

	const emit = defineEmits<{ close: []; reopen: [] }>();

	const haptic = useWebHaptics();
	const { sizeMd } = useResponsiveButtonSize();
</script>

<template>
	<section aria-label="Statut du Creno" data-admin-status>
		<PollClosingField v-model="date" :min-date="minDate" label="Statut">
			<template #leading>
				<div
					class="bg-default flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-1.5"
				>
					<span class="relative flex size-2 shrink-0">
						<span
							v-if="!closed"
							class="bg-success absolute inset-0 animate-ping rounded-full opacity-75 motion-reduce:hidden"
							data-status-pulse
						/>
						<span
							class="relative size-2 rounded-full"
							:class="closed ? 'bg-muted' : 'bg-success'"
						/>
					</span>
					<p
						class="text-highlighted text-sm font-medium"
						data-status-title
					>
						{{ closed ? 'Fermé' : 'Ouvert' }}
					</p>
					<p class="text-muted text-sm">
						{{
							closed
								? `depuis le ${formatDayMonth(new Date(closedAt))}`
								: `jusqu’au ${formatDayMonth(new Date(closedAt))}`
						}}
					</p>
				</div>
			</template>

			<UButton
				v-if="closed"
				data-reopen
				label="Rouvrir une semaine"
				icon="i-lucide-calendar-clock"
				color="neutral"
				variant="ghost"
				:size="sizeMd"
				class="text-muted hover:bg-accented w-full justify-center"
				:loading="pending"
				@click="
					() => {
						haptic.trigger('medium');
						emit('reopen');
					}
				"
			/>
			<UButton
				v-else
				data-close
				label="Clôturer maintenant"
				icon="i-lucide-calendar-x"
				color="neutral"
				variant="ghost"
				:size="sizeMd"
				class="text-muted hover:bg-accented w-full justify-center"
				:loading="pending"
				@click="
					() => {
						haptic.trigger('medium');
						emit('close');
					}
				"
			/>
		</PollClosingField>
	</section>
</template>
