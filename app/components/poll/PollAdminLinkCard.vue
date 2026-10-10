<script setup lang="ts">
	defineProps<{ url: string }>();
</script>

<template>
	<section class="space-y-3" aria-labelledby="admin-link-title">
		<div>
			<h2 id="admin-link-title" class="text-highlighted font-semibold">
				Ton lien admin
			</h2>
			<p class="text-muted text-sm">
				Il te permet de retrouver ce Creno depuis n’importe quel
				appareil.
				<br />
				<span class="text-warning font-medium">
					Garde-le pour toi : il donne accès à la gestion du Creno.
				</span>
			</p>
		</div>

		<CopyField :value="url" label="Lien admin">
			<template #leading>
				<UIcon
					name="i-lucide-key-round"
					class="text-muted mx-1 size-4 shrink-0"
					aria-hidden="true"
				/>
			</template>
		</CopyField>
	</section>
</template>
