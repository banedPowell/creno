<script setup lang="ts">
	defineProps<{ url: string }>();
</script>

<template>
	<section
		class="bg-elevated space-y-3 rounded-xl p-4"
		aria-labelledby="admin-link-title"
	>
		<div>
			<h2 id="admin-link-title" class="text-highlighted font-semibold">
				Ton lien admin
			</h2>
			<p class="text-muted text-sm">
				Il te permet de retrouver ce Creno depuis n’importe quel
				appareil.
			</p>
		</div>

		<UAlert
			color="warning"
			variant="subtle"
			icon="i-lucide-key-round"
			title="Garde ce lien pour toi, il donne accès à la gestion du Creno."
		/>

		<CopyField :value="url" label="Lien admin" />
	</section>
</template>
