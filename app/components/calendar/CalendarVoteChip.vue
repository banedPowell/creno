<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import type { CalendarTimeSlot } from '~/types/calendar';

	const props = defineProps<{
		timeSlot: CalendarTimeSlot;
		continuesBefore?: boolean;
		continuesAfter?: boolean;
	}>();

	const haptic = useWebHaptics();

	const {
		status,
		yes,
		maybe,
		isBest,
		isPast,
		isDimmed,
		disabled,
		tooltip,
		describe,
		toggle,
	} = useSlotVote(() => props.timeSlot);

	const label = computed(() =>
		props.timeSlot.allDay
			? formatAllDayLabel(props.timeSlot)
			: `${props.timeSlot.startTime} – ${props.timeSlot.endTime}`,
	);

	const count = computed(() => yes.value.length + maybe.value.length);

	const { highlightedSlotId } = useCalendarContext();

	// Dimmed but solid, like the timed blocks
	const faded = computed(() => isDimmed.value || isPast.value);
	const highlighted = computed(
		() => highlightedSlotId.value === props.timeSlot.id,
	);

	const onClick = () => {
		if (disabled.value) return;
		haptic.trigger('light');
		toggle();
	};
</script>

<template>
	<UTooltip :delay-duration="300" :ui="{ content: 'h-auto py-1.5' }">
		<template #content>
			<span class="text-xs whitespace-pre-line">{{ tooltip }}</span>
		</template>
		<button
			type="button"
			data-calendar-slot
			:data-vote="status"
			:data-best="isBest || undefined"
			class="flex h-5 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs transition select-none focus-visible:outline-2"
			:class="[
				faded
					? 'bg-muted text-default'
					: status === 'yes'
						? 'bg-vote-yes text-highlighted'
						: status === 'maybe'
							? 'bg-vote-maybe text-highlighted'
							: timeSlot.allDay
								? 'bg-accented text-default'
								: 'text-default',
				disabled
					? 'cursor-default'
					: faded || status === 'none'
						? 'hover:bg-elevated cursor-pointer'
						: status === 'yes'
							? 'hover:bg-vote-yes-hover cursor-pointer'
							: 'hover:bg-vote-maybe-hover cursor-pointer',
				continuesBefore && 'rounded-l-none',
				continuesAfter && 'rounded-r-none',
				faded && '[&>*]:opacity-50',
				highlighted && 'animate-slot-reveal',
			]"
			:data-faded="faded || undefined"
			:data-highlighted="highlighted || undefined"
			:aria-label="describe(label)"
			:aria-disabled="disabled || undefined"
			@click.stop="onClick"
		>
			<span
				class="size-1.5 shrink-0 rounded-full"
				:class="
					isBest
						? 'bg-primary'
						: status === 'yes'
							? 'bg-success'
							: status === 'maybe'
								? 'bg-warning'
								: 'bg-accented'
				"
			/>
			<span class="truncate font-medium tabular-nums">{{ label }}</span>
			<UIcon
				v-if="isBest"
				name="i-lucide-star"
				class="text-primary size-3 shrink-0"
			/>
			<span
				v-if="count"
				class="text-muted ml-auto shrink-0 text-[10px] tabular-nums"
			>
				{{ count }}
			</span>
		</button>
	</UTooltip>
</template>
