<script setup lang="ts">
	defineProps<{
		title: string;
		description?: string | null;
	}>();
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
	</header>
</template>
