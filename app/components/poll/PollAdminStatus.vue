<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	defineProps<{
		closed: boolean;
		closedAt: string | Date;
		// The label of the slot settled on, if any
		chosenLabel?: string | null;
		pending?: boolean;
	}>();

	const emit = defineEmits<{ close: []; reopen: []; unchoose: [] }>();

	const haptic = useWebHaptics();
</script>

<template>
	<section
		class="flex flex-wrap items-center justify-between gap-2"
		aria-label="Statut du Creno"
		data-admin-status
	>
		<div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
			<span
				class="size-2 shrink-0 rounded-full"
				:class="chosenLabel || !closed ? 'bg-success' : 'bg-muted'"
			/>
			<p class="text-highlighted text-sm font-medium" data-status-title>
				{{
					chosenLabel
						? `Créneau retenu : ${chosenLabel}`
						: closed
							? 'Fermé'
							: 'Ouvert'
				}}
			</p>
			<p class="text-muted text-sm">
				{{
					closed
						? `depuis le ${formatDayMonth(new Date(closedAt))}`
						: `jusqu’au ${formatDayMonth(new Date(closedAt))}`
				}}
			</p>
		</div>

		<div class="flex flex-wrap gap-1.5">
			<UButton
				v-if="chosenLabel"
				data-unchoose
				label="Annuler le choix"
				color="neutral"
				variant="ghost"
				:loading="pending"
				@click="emit('unchoose')"
			/>
			<UButton
				v-if="closed"
				data-reopen
				label="Rouvrir une semaine"
				icon="i-lucide-calendar-clock"
				color="neutral"
				variant="soft"
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
				variant="soft"
				:loading="pending"
				@click="
					() => {
						haptic.trigger('medium');
						emit('close');
					}
				"
			/>
		</div>
	</section>
</template>
