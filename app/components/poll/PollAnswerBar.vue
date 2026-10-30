<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	defineProps<{
		isClosed: boolean;
		hasBest: boolean;
		bestCount: number;
		bestLabel: string;
		summary: string;
		isValid: boolean;
		locked: boolean;
		revising: boolean;
		pending: boolean;
	}>();

	const emit = defineEmits<{
		reveal: [];
		revise: [];
		cancel: [];
	}>();

	const haptic = useWebHaptics();
	const { sizeXl } = useResponsiveButtonSize();
</script>

<template>
	<div v-if="!isClosed || hasBest" class="sticky bottom-4 z-40">
		<div
			class="bg-elevated/85 ring-default flex flex-col gap-1.5 rounded-xl p-1.5 shadow-lg ring backdrop-blur sm:flex-row sm:items-center sm:justify-between"
		>
			<p
				v-if="!isClosed"
				data-vote-summary
				class="bg-default rounded-lg px-3 py-1.5 text-sm tabular-nums"
				:class="isValid ? 'text-highlighted' : 'text-muted'"
			>
				{{ summary }}
			</p>

			<div class="flex flex-wrap items-center justify-end gap-1.5">
				<UTooltip
					v-if="hasBest"
					:text="
						bestCount > 1
							? 'Créneaux les plus demandés, à égalité'
							: 'Aller au créneau le plus demandé'
					"
					:kbds="['B']"
				>
					<UButton
						data-best-button
						type="button"
						variant="soft"
						color="neutral"
						icon="i-lucide-star"
						:size="sizeXl"
						class="press"
						:label="bestLabel"
						@click="emit('reveal')"
					/>
				</UTooltip>

				<UButton
					v-if="locked"
					data-revise
					type="button"
					label="Modifier"
					icon="i-lucide-pencil"
					color="neutral"
					variant="solid"
					:size="sizeXl"
					class="press"
					@click="
						() => {
							haptic.trigger('medium');
							emit('revise');
						}
					"
				/>
				<template v-else-if="revising">
					<UButton
						data-cancel-revision
						type="button"
						label="Annuler"
						variant="ghost"
						color="neutral"
						:size="sizeXl"
						class="press"
						@click="
							() => {
								haptic.trigger('light');
								emit('cancel');
							}
						"
					/>
					<UButton
						type="submit"
						label="Valider"
						trailing-icon="i-lucide-check"
						color="neutral"
						variant="solid"
						:size="sizeXl"
						:loading="pending"
						:disabled="pending || !isValid"
						class="press"
						@click="haptic.trigger('medium')"
					/>
				</template>
				<UButton
					v-else-if="!isClosed"
					type="submit"
					label="Envoyer ma réponse"
					trailing-icon="i-lucide-send"
					color="neutral"
					variant="solid"
					:size="sizeXl"
					:loading="pending"
					:disabled="pending || !isValid"
					class="press w-full justify-center sm:w-fit"
					@click="haptic.trigger('medium')"
				/>
			</div>
		</div>
	</div>
</template>
