<template>
	<SkeletonTitle field />

	<div class="grid gap-6 md:grid-cols-2">
		<SkeletonCopyCard />
		<SkeletonCopyCard />
	</div>

	<section class="space-y-3" aria-hidden="true">
		<div class="flex h-6 items-center">
			<USkeleton class="size-3.5 rounded-full" />
		</div>
		<SkeletonCalendar />
	</section>
</template>
