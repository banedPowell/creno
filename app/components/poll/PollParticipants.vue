<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';

	const props = defineProps<{
		participants: { id: string; name: string; voteCount: number }[];
		// The answer sent from this browser
		ownId?: string | null;
		// Anyone's answer may be changed, not only one's own
		canEdit?: boolean;
		// The answer the form currently holds
		editingId?: string | null;
	}>();

	const emit = defineEmits<{ edit: [id: string] }>();

	// The participant whose answers the calendar brings forward
	const focused = defineModel<string | null>({ default: null });

	const haptic = useWebHaptics();

	const toggle = (id: string) => {
		haptic.trigger('light');
		focused.value = focused.value === id ? null : id;
	};

	const focusedParticipant = computed(() =>
		props.participants.find((p) => p.id === focused.value),
	);

	const canEditFocused = computed(
		() =>
			props.canEdit &&
			!!focusedParticipant.value &&
			focusedParticipant.value.id !== props.editingId,
	);
</script>

<template>
	<section class="space-y-2" aria-labelledby="participants-title">
		<h2
			id="participants-title"
			class="text-muted flex items-center gap-1.5 text-sm"
		>
			Participants
			<span
				v-if="participants.length"
				class="bg-elevated rounded-md px-1.5 text-xs tabular-nums"
			>
				{{ participants.length }}
			</span>
		</h2>

		<p v-if="!participants.length" class="text-dimmed text-sm">
			Personne n’a encore répondu, soyez le premier !
		</p>

		<template v-else>
			<ul class="flex flex-wrap gap-1.5">
				<li v-for="participant in participants" :key="participant.id">
					<UButton
						:label="participant.name"
						:avatar="{ alt: participant.name }"
						color="neutral"
						:variant="focused === participant.id ? 'solid' : 'soft'"
						size="sm"
						:data-own="participant.id === ownId || undefined"
						:aria-pressed="focused === participant.id"
						:aria-label="`${participant.name}${participant.id === ownId ? ' (vous)' : ''}, ${participant.voteCount} créneau${participant.voteCount > 1 ? 'x' : ''} choisi${participant.voteCount > 1 ? 's' : ''}`"
						@click="toggle(participant.id)"
					>
						<template v-if="participant.id === ownId" #trailing>
							<span
								class="rounded px-1 text-[10px] leading-4 font-semibold"
								:class="
									focused === participant.id
										? 'bg-inverted/20'
										: 'bg-accented text-muted'
								"
							>
								Vous
							</span>
						</template>
					</UButton>
				</li>
			</ul>

			<div class="flex flex-wrap items-center gap-2">
				<p class="text-dimmed text-xs">
					{{
						focused
							? 'Les créneaux auxquels cette personne n’a pas répondu sont estompés.'
							: 'Touchez un nom pour voir ses réponses sur le calendrier.'
					}}
				</p>
				<UButton
					v-if="canEditFocused"
					data-edit-participant
					:label="`Modifier les réponses de ${focusedParticipant!.name}`"
					icon="i-lucide-pencil"
					color="neutral"
					variant="soft"
					size="xs"
					class="press"
					@click="
						() => {
							haptic.trigger('medium');
							emit('edit', focusedParticipant!.id);
						}
					"
				/>
			</div>
		</template>
	</section>
</template>
