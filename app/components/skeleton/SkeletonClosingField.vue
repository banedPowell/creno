<script setup lang="ts">
	// `status` adds what the admin sidebar wraps around the closing date
	defineProps<{ status?: boolean }>();
</script>

<template>
	<div
		class="flex w-full flex-col gap-2"
		aria-hidden="true"
		data-skeleton-closing
	>
		<div class="flex h-5 items-center">
			<USkeleton class="h-3 w-16" />
		</div>

		<div class="bg-elevated flex w-full flex-col gap-1 rounded-xl p-1.5">
			<div
				v-if="status"
				class="bg-default flex h-8 items-center gap-2 rounded-lg px-3"
			>
				<USkeleton class="size-2 rounded-full" />
				<USkeleton class="h-3 w-32" />
			</div>
			<div class="flex h-8 items-center justify-between px-2.5 md:h-7">
				<USkeleton class="h-3 w-28" />
				<USkeleton class="size-4 rounded" />
			</div>
			<div class="grid h-8 grid-cols-2 gap-0.5 md:h-7">
				<div
					v-for="step in 2"
					:key="step"
					class="flex items-center justify-center"
				>
					<USkeleton class="size-4 rounded" />
				</div>
			</div>
			<div class="grid h-8 grid-cols-3 md:h-7">
				<div
					v-for="preset in 3"
					:key="preset"
					class="flex items-center justify-center"
				>
					<USkeleton class="h-3 w-12" />
				</div>
			</div>
			<div
				v-if="status"
				class="flex h-8 items-center justify-center md:h-7"
			>
				<USkeleton class="h-3 w-36" />
			</div>
		</div>
	</div>
</template>
