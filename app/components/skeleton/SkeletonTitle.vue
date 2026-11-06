<script setup lang="ts">
	// `field` matches the title and description inputs of the admin page,
	// otherwise the plain heading of the vote page
	defineProps<{ field?: boolean }>();
</script>

<template>
	<div aria-hidden="true" data-skeleton-title>
		<div
			class="flex items-center"
			:class="field ? 'h-13 md:h-14' : 'h-9 md:h-10'"
		>
			<USkeleton class="h-8 w-2/3 max-w-md md:h-9" />
		</div>
		<div class="flex items-center" :class="field ? 'h-9' : 'mt-1 h-6'">
			<USkeleton class="h-4 w-1/2 max-w-sm" />
		</div>
	</div>
</template>
