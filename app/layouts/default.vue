<script setup lang="ts"></script>

<template>
	<UHeader title="Creno">
		<template #right>
			<UButton
				icon="lucide-calendar"
				label="Lancer un creno"
				size="sm"
				variant="soft"
				to="/poll/create"
			/>

			<UColorModeButton size="sm" color="primary" />
		</template>
	</UHeader>

	<UMain>
		<slot />
	</UMain>

	<UFooter> {{ new Date().getFullYear() }} © Creno </UFooter>
</template>
