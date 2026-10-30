<script setup lang="ts">
	import type { CalendarTimeSlot } from '~/types/calendar';

	defineProps<{
		dirty: boolean;
		hasBest: boolean;
		bestLabel: string;
		summary: string;
		issue?: string;
		pending: null | string;
		lostVotes: number;
		pendingSlots: CalendarTimeSlot[] | null;
	}>();

	const confirmOpen = defineModel<boolean>('confirmOpen', { required: true });

	const emit = defineEmits<{
		reveal: [];
		cancel: [];
		save: [];
		confirm: [slots: CalendarTimeSlot[]];
	}>();

	const { sizeXl } = useResponsiveButtonSize();
</script>

<template>
	<UModal
		v-model:open="confirmOpen"
		title="Des réponses vont être perdues"
		:description="`Les créneaux retirés emportent ${lostVotes} réponse${lostVotes > 1 ? 's' : ''}. Les créneaux déplacés gardent les leurs.`"
	>
		<template #footer>
			<div class="flex w-full justify-end gap-2">
				<UButton
					label="Annuler"
					color="neutral"
					variant="ghost"
					@click="confirmOpen = false"
				/>
				<UButton
					label="Enregistrer quand même"
					color="error"
					:loading="pending === 'slots'"
					data-confirm-slots
					@click="pendingSlots && emit('confirm', pendingSlots)"
				/>
			</div>
		</template>
	</UModal>

	<div v-if="dirty || hasBest" class="sticky bottom-4 z-40">
		<div
			class="bg-elevated/85 ring-default flex flex-col gap-1.5 rounded-xl p-1.5 shadow-lg ring backdrop-blur sm:flex-row sm:items-center sm:justify-between"
		>
			<p
				class="bg-default rounded-lg px-3 py-1.5 text-sm tabular-nums"
				:class="issue ? 'text-error' : 'text-highlighted'"
			>
				{{ summary }}
			</p>
			<div class="flex flex-wrap items-center justify-end gap-1.5">
				<UTooltip
					v-if="hasBest"
					text="Aller au créneau le plus demandé"
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
					v-if="dirty"
					data-admin-cancel
					label="Annuler"
					color="neutral"
					variant="ghost"
					:size="sizeXl"
					@click="emit('cancel')"
				/>
				<UButton
					v-if="dirty"
					data-admin-save
					label="Enregistrer"
					icon="i-lucide-check"
					color="neutral"
					:size="sizeXl"
					:loading="pending === 'settings' || pending === 'slots'"
					:disabled="!!issue || !!pending"
					class="press"
					@click="emit('save')"
				/>
			</div>
		</div>
	</div>
</template>
