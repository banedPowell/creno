<script setup lang="ts">
	defineProps<{ title: string; pending?: boolean }>();

	const emit = defineEmits<{ confirm: [] }>();

	const open = ref(false);
</script>

<template>
	<section
		class="ring-error/30 flex flex-col gap-3 rounded-xl p-4 ring sm:flex-row sm:items-center sm:justify-between"
		aria-labelledby="delete-title"
	>
		<div>
			<h2 id="delete-title" class="text-highlighted font-semibold">
				Supprimer le Creno
			</h2>
			<p class="text-muted text-sm">
				Le lien cessera de fonctionner et toutes les réponses seront
				effacées.
			</p>
		</div>

		<UModal
			v-model:open="open"
			title="Supprimer ce Creno ?"
			:description="`« ${title} » et toutes ses réponses seront définitivement effacés.`"
		>
			<UButton
				label="Supprimer"
				icon="i-lucide-trash-2"
				color="error"
				variant="soft"
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
