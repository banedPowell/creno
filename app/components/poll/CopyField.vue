<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	const props = defineProps<{ value: string; label: string }>();

	const haptic = useWebHaptics();
	const { sizeMd } = useResponsiveButtonSize();
	const { copy, copied } = useClipboard({ legacy: true });
	const copyTick = ref(0);

	async function copyValue() {
		await copy(props.value);
		if (!copied.value) return;
		copyTick.value += 1;
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
				:aria-label="`${copied ? 'Copié' : 'Copier'} : ${label}`"
				color="neutral"
				variant="solid"
				:size="sizeMd"
				class="press justify-center sm:w-fit"
				@click="copyValue"
			>
				<template #leading>
					<CopyIcon :copied="copied" :tick="copyTick" />
				</template>

				<!-- Both labels stay in the layout, so the button keeps the wider width -->
				<span class="grid">
					<span
						class="col-start-1 row-start-1"
						:class="copied ? 'invisible' : undefined"
					>
						Copier
					</span>
					<span
						class="col-start-1 row-start-1"
						:class="copied ? undefined : 'invisible'"
					>
						Copié
					</span>
				</span>
			</UButton>
		</div>
	</div>
</template>
