<script setup lang="ts">
	defineProps<{ label: string; pending?: boolean }>();

	const emit = defineEmits<{ unchoose: [] }>();

	const { sizeMd } = useResponsiveButtonSize();
</script>

<template>
	<section
		class="bg-elevated flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-xl p-1.5"
		aria-label="Créneau retenu"
	>
		<p
			class="bg-default text-highlighted flex min-w-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium"
			data-chosen-slot
		>
			<UIcon
				name="i-lucide-star"
				class="text-success size-4 shrink-0"
				aria-hidden="true"
			/>
			Créneau retenu : {{ label }}
		</p>
		<UButton
			data-unchoose
			label="Annuler le choix"
			color="neutral"
			variant="ghost"
			:size="sizeMd"
			class="text-muted hover:bg-accented"
			:loading="pending"
			@click="emit('unchoose')"
		/>
	</section>
</template>
