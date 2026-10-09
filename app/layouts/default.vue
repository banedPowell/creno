<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	const { sizeMd } = useResponsiveButtonSize();
	const haptic = useWebHaptics();
	const route = useRoute();
</script>

<template>
	<UHeader title="Creno" :toggle="false">
		<template #title>
			<NuxtLink
				to="/"
				class="text-highlighted flex items-center gap-2 text-lg font-semibold"
				@click="haptic.trigger('light')"
			>
				<span
					class="bg-inverted text-inverted flex size-7 items-center justify-center rounded-md"
				>
					<UIcon name="i-lucide-calendar-check" class="size-4" />
				</span>
				Creno
			</NuxtLink>
		</template>

		<template #right>
			<div class="bg-elevated flex items-center gap-1 rounded-xl p-1">
				<UButton
					v-if="route.path !== '/poll/create'"
					icon="lucide-calendar-plus"
					label="Lancer un Creno"
					color="neutral"
					variant="solid"
					:size="sizeMd"
					to="/poll/create"
					@click="haptic.trigger('light')"
				/>

				<UColorModeButton
					color="neutral"
					variant="ghost"
					:size="sizeMd"
					class="hover:bg-accented"
					@click="haptic.trigger('light')"
				/>
			</div>
		</template>
	</UHeader>

	<UMain>
		<slot />
	</UMain>

	<UFooter :ui="{ center: 'text-muted text-xs' }">
		{{ new Date().getFullYear() }} © Creno
	</UFooter>
</template>
