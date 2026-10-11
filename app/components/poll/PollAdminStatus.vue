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
		class="bg-elevated flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
		aria-label="Statut du Creno"
		data-admin-status
	>
		<div class="flex items-start gap-3">
			<UIcon
				:name="
					chosenLabel
						? 'i-lucide-calendar-check'
						: closed
							? 'i-lucide-calendar-x'
							: 'i-lucide-calendar-clock'
				"
				class="mt-0.5 size-5 shrink-0"
				:class="chosenLabel || !closed ? 'text-success' : 'text-muted'"
			/>
			<div>
				<p class="text-highlighted font-medium" data-status-title>
					{{
						chosenLabel
							? `Créneau retenu : ${chosenLabel}`
							: closed
								? 'Les votes sont fermés'
								: 'Les votes sont ouverts'
					}}
				</p>
				<p class="text-muted text-sm">
					{{
						closed
							? `Fermé depuis le ${formatFullDate(new Date(closedAt))}.`
							: `Jusqu’au ${formatFullDate(new Date(closedAt))}.`
					}}
				</p>
			</div>
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
