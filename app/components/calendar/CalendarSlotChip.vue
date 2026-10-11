<script setup lang="ts">
	import type { CalendarTimeSlot } from '~/types/calendar';

	const props = defineProps<{
		timeSlot: CalendarTimeSlot;
		// The slot being drawn, not saved yet
		ghost?: boolean;
		continuesBefore?: boolean;
		continuesAfter?: boolean;
	}>();

	const { slotActions, now, vote } = useCalendarContext();
	const look = vote ? useSlotVote(() => props.timeSlot) : null;

	const onClick = () => {
		if (vote?.picking) vote.picking.select(props.timeSlot.id);
		else slotActions.removeSlot(props.timeSlot.id);
	};

	const isPast = computed(
		() => !props.ghost && isSlotPast(props.timeSlot, now.value),
	);

	const label = computed(() =>
		props.timeSlot.allDay
			? formatAllDayLabel(props.timeSlot)
			: `${props.timeSlot.startTime} – ${props.timeSlot.endTime}`,
	);
</script>

<template>
	<button
		type="button"
		data-calendar-slot
		:data-best="look?.isBest.value || undefined"
		:data-chosen="look?.isChosen.value || undefined"
		:data-selected="look?.isSelected.value || undefined"
		class="group flex h-5 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs transition-colors select-none focus-visible:outline-2"
		:class="[
			ghost
				? 'bg-primary/10 border-primary/40 pointer-events-none border border-dashed'
				: timeSlot.allDay
					? 'bg-accented text-highlighted hover:bg-accented/70 cursor-pointer'
					: 'text-default hover:bg-elevated cursor-pointer',
			continuesBefore && 'rounded-l-none',
			continuesAfter && 'rounded-r-none',
			isPast && 'ring-error opacity-60 ring ring-inset',
		]"
		:aria-label="
			look
				? look.describe(label)
				: `Créneau ${label}${isPast ? ', déjà passé' : ''}, cliquer pour supprimer`
		"
		:data-past="isPast || undefined"
		@click.stop="onClick"
	>
		<span
			v-if="!timeSlot.allDay"
			class="bg-primary size-1.5 shrink-0 rounded-full"
		/>
		<span class="truncate font-medium tabular-nums">{{ label }}</span>
		<span
			v-if="look && (look.yes.value.length || look.maybe.value.length)"
			class="text-muted shrink-0 text-[10px] tabular-nums"
		>
			{{ look.yes.value.length + look.maybe.value.length }}
		</span>
		<UIcon
			v-if="!ghost"
			name="i-lucide-x"
			class="text-muted ml-auto size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
		/>
	</button>
</template>
