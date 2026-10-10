<script setup lang="ts">
	const props = defineProps<{
		title: string;
		description?: string | null;
		slotCount: number;
		closedAt: string | Date;
	}>();

	const details = computed(
		() =>
			`${props.slotCount} créneau${props.slotCount > 1 ? 'x' : ''} · clôture le ${formatFullDate(new Date(props.closedAt))}`,
	);
</script>

<template>
	<header class="space-y-2">
		<h1 class="text-highlighted text-3xl font-bold break-words md:text-4xl">
			{{ title }}
		</h1>
		<p v-if="description" class="text-muted whitespace-pre-line">
			{{ description }}
		</p>
		<p class="text-muted text-sm tabular-nums">{{ details }}</p>
	</header>
</template>
