<script setup lang="ts">
	defineProps<{ title: string; pending?: boolean }>();

	const emit = defineEmits<{ confirm: [] }>();

	const open = ref(false);
</script>

<template>
	<section
		class="border-default space-y-2 border-t pt-4"
		aria-labelledby="delete-title"
	>
		<h2 id="delete-title" class="text-muted text-sm">Zone de danger</h2>
		<p class="text-dimmed text-xs">
			Le lien cessera de fonctionner et toutes les réponses seront
			effacées.
		</p>

		<UModal
			v-model:open="open"
			title="Supprimer ce Creno ?"
			:description="`« ${title} » et toutes ses réponses seront définitivement effacés.`"
		>
			<UButton
				label="Supprimer le Creno"
				icon="i-lucide-trash-2"
				color="error"
				variant="ghost"
				size="sm"
				class="press -ml-2.5"
				data-delete
			/>

			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton
						label="Annuler"
						color="neutral"
						variant="ghost"
						@click="open = false"
					/>
					<UButton
						label="Supprimer définitivement"
						color="error"
						:loading="pending"
						data-confirm-delete
						@click="emit('confirm')"
					/>
				</div>
			</template>
		</UModal>
	</section>
</template>
