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
	<div
		class="bg-elevated flex flex-col gap-1.5 rounded-xl p-1.5 sm:flex-row sm:items-center"
	>
		<div
			class="flex min-w-0 flex-1 items-center"
			:class="$slots.leading ? 'gap-1.5' : ''"
		>
			<slot name="leading" />

			<UInput
				:model-value="value"
				readonly
				variant="none"
				:aria-label="label"
				:size="sizeMd"
				class="bg-default min-w-0 flex-1 rounded-lg"
				:ui="{ base: 'text-muted truncate px-3' }"
				@focus="selectAll"
			/>
		</div>

		<div class="flex w-full items-center justify-end gap-1.5 sm:w-auto">
			<slot />

			<UButton
				:icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
				:label="copied ? 'Copié' : 'Copier'"
				:aria-label="`Copier : ${label}`"
				color="neutral"
				variant="solid"
				:size="sizeMd"
				class="justify-center sm:w-fit"
				@click="copyValue"
			/>
		</div>
	</div>
</template>
