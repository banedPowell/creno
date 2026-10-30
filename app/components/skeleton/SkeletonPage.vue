<script setup lang="ts">
	// The same frame as the poll pages, so nothing moves once they load
	const sidebarOpen = ref(true);
</script>

<template>
	<div
		class="flex min-h-[calc(100svh-var(--ui-header-height))] min-w-0 flex-1"
		aria-busy="true"
		data-skeleton-page
	>
		<USidebar
			v-model:open="sidebarOpen"
			collapsible="offcanvas"
			mode="slideover"
			:style="{ '--sidebar-width': '20rem' }"
			:ui="{
				gap: 'h-[calc(100%-var(--ui-header-height))]',
				container:
					'top-(--ui-header-height) h-[calc(100%-var(--ui-header-height))]',
			}"
		>
			<div class="flex flex-col gap-6">
				<slot name="sidebar" />
			</div>
		</USidebar>

		<div class="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
			<UButton
				icon="i-lucide-panel-left"
				color="neutral"
				variant="ghost"
				aria-label="Afficher le panneau"
				class="w-fit lg:hidden"
				@click="sidebarOpen = !sidebarOpen"
			/>
			<slot />
		</div>
	</div>
</template>
