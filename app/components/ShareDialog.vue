<script setup lang="ts">
	const props = defineProps<{
		open: boolean;
		slug: string;
		adminToken: string;
	}>();

	const emit = defineEmits<{
		'update:open': [val: boolean];
	}>();

	const toast = useToast();

	const participantLink = computed(() => {
		if (import.meta.client) {
			return `${window.location.origin}/poll/${props.slug}`;
		}
		return `/poll/${props.slug}`;
	});

	const adminLink = computed(() => {
		if (import.meta.client) {
			return `${window.location.origin}/poll/${props.slug}/admin/${props.adminToken}`;
		}
		return `/poll/${props.slug}/admin/${props.adminToken}`;
	});

	async function copyToClipboard(text: string, label: string) {
		await navigator.clipboard.writeText(text);
		toast.add({
			title: `${label} copié !`,
			icon: 'i-lucide-check',
			color: 'success',
		});
	}
</script>

<template>
	<UModal
		:open="open"
		@update:open="emit('update:open', $event)"
	>
		<template #header>
			<h3 class="text-lg font-semibold">Sondage créé avec succès !</h3>
		</template>

		<template #body>
			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Lien pour les participants
					</label>
					<div class="flex gap-2">
						<UInput
							:model-value="participantLink"
							readonly
							class="flex-1"
						/>
						<UButton
							icon="i-lucide-copy"
							variant="soft"
							@click="copyToClipboard(participantLink, 'Lien participant')"
						/>
					</div>
					<p class="mt-1 text-xs text-neutral-500">
						Partagez ce lien avec les personnes qui doivent répondre.
					</p>
				</div>

				<USeparator />

				<div>
					<label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Lien d'administration
					</label>
					<div class="flex gap-2">
						<UInput
							:model-value="adminLink"
							readonly
							class="flex-1"
						/>
						<UButton
							icon="i-lucide-copy"
							variant="soft"
							@click="copyToClipboard(adminLink, 'Lien admin')"
						/>
					</div>
					<p class="mt-1 text-xs text-neutral-500">
						Gardez ce lien privé. Il permet de modifier ou supprimer
						le sondage.
					</p>
				</div>
			</div>
		</template>

		<template #footer>
			<div class="flex justify-end gap-2">
				<UButton
					variant="soft"
					@click="navigateTo(`/poll/${slug}`)"
				>
					Voir le sondage
				</UButton>
				<UButton
					@click="navigateTo(`/poll/${slug}/admin/${adminToken}`)"
				>
					Administration
				</UButton>
			</div>
		</template>
	</UModal>
</template>
