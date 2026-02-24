<script setup lang="ts">
	defineProps<{
		title: string;
		description?: string | null;
		slotDuration: number;
		slotCount: number;
		participantCount: number;
		closed?: boolean;
	}>();
</script>

<template>
	<div>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold">{{ title }}</h1>
				<p v-if="description" class="mt-1 text-neutral-500">
					{{ description }}
				</p>
			</div>
			<UBadge v-if="closed" color="error" variant="subtle" size="lg">
				Fermé
			</UBadge>
		</div>
		<div
			class="mt-3 flex flex-wrap gap-4 text-sm text-neutral-500"
		>
			<span class="flex items-center gap-1">
				<UIcon name="i-lucide-clock" class="h-4 w-4" />
				{{ slotDuration }} min
			</span>
			<span class="flex items-center gap-1">
				<UIcon name="i-lucide-calendar" class="h-4 w-4" />
				{{ slotCount }} créneau{{ slotCount > 1 ? 'x' : '' }}
			</span>
			<span class="flex items-center gap-1">
				<UIcon name="i-lucide-users" class="h-4 w-4" />
				{{ participantCount }} participant{{
					participantCount > 1 ? 's' : ''
				}}
			</span>
		</div>
	</div>
</template>
