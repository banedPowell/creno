<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	const { sizeMd } = useResponsiveButtonSize();
	const haptic = useWebHaptics();
</script>

<template>
	<UHeader title="Creno" :toggle="false">
		<template #title>
			<UButton
				variant="link"
				color="neutral"
				to="/"
				class="font-bold text-xl text-highlighted p-0 min-w-0 h-auto"
				@click="haptic.trigger('light')"
			>
				Creno
			</UButton>
		</template>

		<template #right>
			<UColorModeButton
				:size="sizeMd"
				color="primary"
				@click="haptic.trigger('light')"
			/>

			<UButton
				icon="lucide-calendar"
				label="Lancer un Creno"
				:size="sizeMd"
				to="/poll/create"
				@click="haptic.trigger('light')"
			/>
		</template>
	</UHeader>

	<UMain>
		<slot />
	</UMain>

	<UFooter> {{ new Date().getFullYear() }} © Creno </UFooter>
</template>
