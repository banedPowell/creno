<script setup lang="ts">
	const { sizeMd } = useResponsiveButtonSize();
</script>

<template>
	<UHeader title="Creno" :toggle="false">
		<template #right>
			<UColorModeButton :size="sizeMd" color="primary" />

			<UButton
				icon="lucide-calendar"
				label="Lancer un Creno"
				:size="sizeMd"
				to="/poll/create"
			/>
		</template>
	</UHeader>

	<UMain>
		<slot />
	</UMain>

	<UFooter> {{ new Date().getFullYear() }} © Creno </UFooter>
</template>
