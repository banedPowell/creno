<script setup lang="ts">
	import type { CalendarTimeSlot } from '~/types/calendar';

	const props = defineProps<{
		timeSlot: CalendarTimeSlot;
		// The slot being drawn, not saved yet
		ghost?: boolean;
		continuesBefore?: boolean;
		continuesAfter?: boolean;
	}>();

	const {
		slotActions,
		now,
		vote,
		calendar,
		highlightedSlotId,
		hoveredSlotId,
	} = useCalendarContext();
	const look = vote ? useSlotVote(() => props.timeSlot) : null;
	const faded = computed(
		() => !!look && (look.isDimmed.value || look.isPast.value),
	);
	const highlighted = computed(
		() => !!look && highlightedSlotId.value === props.timeSlot.id,
	);
	const count = computed(
		() => (look?.yes.value.length ?? 0) + (look?.maybe.value.length ?? 0),
	);

	const picking = computed(() => !!vote?.picking);
	const spanned = computed(
		() =>
			calendar.view.value === 'month' &&
			!!props.timeSlot.allDay &&
			(props.timeSlot.startDate !== props.timeSlot.endDate ||
				!!props.continuesBefore ||
				!!props.continuesAfter),
	);
	const linked = computed(
		() => spanned.value && hoveredSlotId.value === props.timeSlot.id,
	);

	const onClick = () => {
		if (vote?.picking) vote.picking.select(props.timeSlot.id);
		else slotActions.removeSlot(props.timeSlot.id);
	};

	const remove = () => slotActions.removeSlot(props.timeSlot.id);

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
	<UTooltip
		:disabled="!look"
		:delay-duration="300"
		:ui="{ content: 'h-auto py-1.5' }"
	>
		<template v-if="look" #content>
			<span class="text-xs whitespace-pre-line">{{
				look.tooltip.value
			}}</span>
		</template>
		<button
			type="button"
			data-calendar-slot
			:data-best="look?.isBest.value || undefined"
			:data-chosen="look?.isChosen.value || undefined"
			:data-selected="look?.isSelected.value || undefined"
			:data-highlighted="highlighted || undefined"
			:data-faded="faded || undefined"
			class="group flex h-5 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs transition-colors select-none focus-visible:outline-2"
			:class="[
				ghost
					? 'bg-primary/10 border-primary/40 pointer-events-none border border-dashed'
					: look
						? faded
							? 'bg-muted text-default hover:bg-elevated cursor-pointer'
							: 'bg-default text-default hover:bg-elevated cursor-pointer'
						: timeSlot.allDay
							? 'bg-accented text-highlighted hover:bg-accented/70 cursor-pointer'
							: 'text-default hover:bg-elevated cursor-pointer',
				spanned && 'ring-primary/20 ring-1 ring-inset',
				linked && (look ? '!bg-elevated' : '!bg-accented/70'),
				look?.isSelected.value && 'outline-primary outline-2',
				continuesBefore && 'rounded-l-none',
				continuesAfter && 'rounded-r-none',
				!look && isPast && 'ring-error opacity-60 ring ring-inset',
				faded && '[&>*]:opacity-50',
				highlighted && 'animate-slot-reveal',
			]"
			:aria-label="
				look
					? look.describe(label)
					: `Créneau ${label}${isPast ? ', déjà passé' : ''}, cliquer pour supprimer`
			"
			:data-past="isPast || undefined"
			@click.stop="onClick"
			@pointerenter="hoveredSlotId = timeSlot.id"
			@pointerleave="
				hoveredSlotId === timeSlot.id && (hoveredSlotId = null)
			"
		>
			<span
				v-if="!timeSlot.allDay"
				class="size-1.5 shrink-0 rounded-full"
				:class="
					look?.isChosen.value
						? 'bg-success'
						: look?.isBest.value
							? 'bg-primary'
							: look
								? 'bg-accented'
								: 'bg-primary'
				"
			/>
			<span class="truncate font-medium tabular-nums">{{ label }}</span>
			<UIcon
				v-if="look?.isChosen.value"
				data-chosen-badge
				name="i-lucide-calendar-check"
				class="text-success size-3 shrink-0"
			/>
			<UIcon
				v-else-if="look?.isBest.value"
				data-best-badge
				name="i-lucide-star"
				class="text-primary size-3 shrink-0"
			/>
			<span
				v-if="count"
				class="text-muted shrink-0 text-[10px] tabular-nums"
			>
				{{ count }}
			</span>
			<button
				v-if="!ghost && picking"
				type="button"
				data-remove-slot
				aria-label="Retirer ce créneau"
				class="text-muted hover:bg-accented ml-auto inline-flex size-4 shrink-0 items-center justify-center rounded p-0"
				@click.stop="remove"
				@pointerdown.stop
			>
				<UIcon name="i-lucide-x" class="size-3" />
			</button>
			<UIcon
				v-else-if="!ghost"
				name="i-lucide-x"
				class="text-muted ml-auto size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
			/>
		</button>
	</UTooltip>
</template>
