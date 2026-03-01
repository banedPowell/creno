<script setup lang="ts"></script>

<template>
	<UHeader title="Creno" :toggle="false">
		<template #right>
			<UColorModeButton size="sm" color="primary" />

			<UButton
				icon="lucide-calendar"
				label="Lancer un Creno"
				size="sm"
				to="/poll/create"
			/>
		</template>
	</UHeader>

	<UMain>
		<slot />
	</UMain>

	<UFooter> {{ new Date().getFullYear() }} © Creno </UFooter>
</template>
