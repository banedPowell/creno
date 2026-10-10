<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	const props = defineProps<{ value: string; label: string }>();

	const haptic = useWebHaptics();
	const { sizeMd } = useResponsiveButtonSize();
	const { copy, copied } = useClipboard({ legacy: true });

	async function copyValue() {
		await copy(props.value);
		haptic.trigger('success');
	}

	const selectAll = (event: FocusEvent) =>
		(event.target as HTMLInputElement).select();
</script>

<template>
	<div class="flex items-center gap-2">
		<UInput
			:model-value="value"
			readonly
			:aria-label="label"
			:size="sizeMd"
			class="min-w-0 flex-1"
			:ui="{ base: 'text-muted truncate' }"
			@focus="selectAll"
		/>
		<UButton
			:icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
			:label="copied ? 'Copié' : 'Copier'"
			:aria-label="`Copier : ${label}`"
			color="neutral"
			variant="solid"
			:size="sizeMd"
			class="shrink-0"
			@click="copyValue"
		/>
	</div>
</template>
