<script setup lang="ts">
	defineProps<{ wrong?: boolean; pending?: boolean }>();

	const emit = defineEmits<{ submit: [password: string] }>();

	const password = ref('');

	const onSubmit = () => {
		if (password.value) emit('submit', password.value);
	};
</script>

<template>
	<section
		class="mx-auto max-w-sm space-y-4 py-12 text-center"
		aria-labelledby="password-title"
		data-password-prompt
	>
		<UIcon name="i-lucide-lock-keyhole" class="text-muted size-8" />
		<div>
			<h1
				id="password-title"
				class="text-highlighted text-xl font-semibold"
			>
				Ce Creno est protégé
			</h1>
			<p class="text-muted text-sm">
				Saisissez le mot transmis par l’organisateur pour l’ouvrir.
			</p>
		</div>

		<form class="flex flex-col gap-2" @submit.prevent="onSubmit">
			<UInput
				v-model="password"
				type="password"
				autocomplete="current-password"
				aria-label="Mot de protection"
				placeholder="Mot de protection"
				:color="wrong ? 'error' : undefined"
				:highlight="wrong"
				autofocus
				class="w-full"
				data-password-input
			/>
			<p v-if="wrong" class="text-error text-sm" data-password-error>
				Ce n’est pas le bon mot.
			</p>
			<UButton
				type="submit"
				label="Ouvrir"
				color="neutral"
				block
				:loading="pending"
				:disabled="!password || pending"
			/>
		</form>
	</section>
</template>
