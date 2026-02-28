<script setup lang="ts"></script>

<template>
	<UHeader title="Creno">
		<template #right>
			<UButton
				icon="lucide-calendar"
				label="Faire un creno"
				size="sm"
				variant="soft"
				to="/polls"
			/>

			<UColorModeButton size="sm" color="primary" />
		</template>
	</UHeader>

	<UMain>
		<slot />
	</UMain>

	<UFooter> {{ new Date().getFullYear() }} Creno </UFooter>
</template>
