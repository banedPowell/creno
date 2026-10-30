<template>
	<div class="sticky bottom-4 z-40" aria-hidden="true" data-skeleton-bar>
		<div
			class="bg-elevated/85 ring-default flex flex-col gap-1.5 rounded-xl p-1.5 shadow-lg ring backdrop-blur sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="bg-default flex h-8 items-center rounded-lg px-3">
				<USkeleton class="h-3 w-40" />
			</div>
			<USkeleton class="h-10 w-full rounded-md sm:w-40 md:h-7" />
		</div>
	</div>
</template>
