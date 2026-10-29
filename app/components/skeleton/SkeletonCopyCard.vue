<template>
	<div class="space-y-3" aria-hidden="true" data-skeleton-copy-card>
		<div>
			<div class="flex h-6 items-center">
				<USkeleton class="h-4 w-48" />
			</div>
			<div class="flex h-5 items-center">
				<USkeleton class="h-3 w-full max-w-72" />
			</div>
		</div>

		<div class="bg-elevated flex items-center gap-1.5 rounded-xl p-1.5">
			<div class="bg-default h-8 flex-1 rounded-lg md:h-7" />
			<USkeleton class="h-8 w-8 rounded-md sm:w-24 md:h-7" />
			<USkeleton class="h-8 w-20 rounded-md md:h-7" />
		</div>
	</div>
</template>
