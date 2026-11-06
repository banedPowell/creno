<template>
	<div
		class="border-default space-y-2 border-t pt-4"
		aria-hidden="true"
		data-skeleton-danger
	>
		<div class="flex h-5 items-center">
			<USkeleton class="h-3 w-28" />
		</div>
		<div class="flex h-4 items-center">
			<USkeleton class="h-2.5 w-full" />
		</div>
		<USkeleton class="h-7 w-40 rounded-md" />
	</div>
</template>
