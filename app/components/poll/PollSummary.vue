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
	<header class="space-y-3">
		<div>
			<h1
				class="text-highlighted text-3xl font-bold break-words md:text-4xl"
			>
				{{ title }}
			</h1>
			<p v-if="description" class="text-muted mt-1 whitespace-pre-line">
				{{ description }}
			</p>
		</div>

		<p
			class="bg-elevated text-muted w-fit rounded-xl px-3 py-1.5 text-sm tabular-nums"
		>
			{{ details }}
		</p>
	</header>
</template>
