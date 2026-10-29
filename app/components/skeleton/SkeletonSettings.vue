<template>
	<div class="flex flex-col gap-5" aria-hidden="true" data-skeleton-grid>
		<div v-for="field in 2" :key="field">
			<div class="flex h-5 items-center">
				<USkeleton class="h-3 w-36" />
			</div>
			<USkeleton class="mt-1 h-8 w-full rounded-md" />
		</div>
	</div>

	<USkeleton class="h-8 w-44 rounded-md" aria-hidden="true" />
</template>
