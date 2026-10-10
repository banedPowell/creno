<script setup lang="ts">
	defineProps<{
		// Whose answer the form holds, when it is not a new one
		editing?: { name: string; own: boolean } | null;
		// A saved answer stays put until the visitor asks to change it
		disabled?: boolean;
	}>();

	const name = defineModel<string>({ required: true });

	const { sizeMd } = useResponsiveButtonSize();
</script>

<template>
	<div class="flex flex-wrap items-center gap-2">
		<div
			class="bg-elevated flex w-full items-center gap-1 rounded-xl p-1.5 sm:w-fit"
		>
			<label
				for="voter-name"
				class="text-muted shrink-0 px-2 text-sm select-none"
			>
				Votre nom
			</label>
			<UInput
				id="voter-name"
				v-model="name"
				variant="none"
				aria-label="Votre nom"
				placeholder="Camille"
				autocomplete="given-name"
				:disabled="disabled"
				:size="sizeMd"
				class="w-full sm:w-64"
				:ui="{
					base: 'bg-default hover:bg-accented/40 focus-visible:ring-accented rounded-lg transition-colors focus-visible:ring',
				}"
			/>
		</div>

		<div
			v-if="editing && !editing.own"
			data-editing
			class="bg-elevated flex items-center gap-1 rounded-xl p-1.5"
		>
			<span
				class="bg-default text-muted flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
			>
				<UIcon name="i-lucide-pencil" class="size-3.5 shrink-0" />
				<span>
					Vous modifiez la réponse de
					<span class="text-highlighted font-medium">{{
						editing.name
					}}</span>
				</span>
			</span>
		</div>
	</div>
</template>
