<script setup lang="ts">
	import type { PositionedSlot } from '~/utils/calendarLayout';

	const props = defineProps<{
		positioned: PositionedSlot;
	}>();

	const { config, slotActions, now } = useCalendarContext();

	const slot = computed(() => props.positioned.slot);

	// It started while the page was open, it can no longer be sent
	const isPast = computed(() => isSlotPast(slot.value, now.value));

	const {
		dragging,
		suppressed,
		mode,
		deltaX,
		preview,
		onPointerdown,
		onPointermove,
		onPointerup,
		onPointercancel,
	} = useSlotDrag(slot, config, {
		onCommit: (updates) => slotActions.updateSlot(slot.value.id, updates),
		now,
	});

	const original = computed(() => ({
		start: timeToMinutes(slot.value.startTime),
		end: timeToMinutes(slot.value.endTime),
	}));

	const style = computed(() => {
		const { start, end } = preview.value;
		const offset = (start - original.value.start) * PX_PER_MINUTE;
		const resize =
			(end - start - (original.value.end - original.value.start)) *
			PX_PER_MINUTE;

		return {
			...slotBlockStyle({
				...props.positioned,
				top: props.positioned.top + offset,
				height: props.positioned.height + resize,
			}),
			transform:
				dragging.value && mode.value === 'move'
					? `translateX(${deltaX.value}px)`
					: undefined,
		};
	});

	const times = computed(
		() =>
			`${minutesToTime(preview.value.start)} – ${minutesToTime(preview.value.end)}`,
	);

	const compact = computed(
		() => preview.value.end - preview.value.start < 45,
	);

	const onClick = () => {
		if (suppressed.value) return;
		slotActions.removeSlot(slot.value.id);
	};
</script>

<template>
	<button
		type="button"
		data-calendar-slot
		class="group bg-elevated hover:bg-accented absolute flex touch-none overflow-hidden rounded-md text-left text-xs ring transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-1"
		:class="[
			dragging ? 'z-20 cursor-grabbing shadow-lg' : 'z-5 cursor-pointer',
			compact ? 'items-center' : 'flex-col',
			isPast ? 'ring-error opacity-60' : 'ring-accented',
		]"
		:style="style"
		:aria-label="`Créneau ${times}${isPast ? ', déjà passé' : ''}, cliquer pour supprimer`"
		:data-past="isPast || undefined"
		@click.stop="onClick"
		@pointerdown="onPointerdown"
		@pointermove="onPointermove"
		@pointerup="onPointerup"
		@pointercancel="onPointercancel"
	>
		<span class="bg-primary absolute inset-y-1 left-1 w-1 rounded-full" />

		<!-- Next to another slot the block gets narrow, the end time drops to
			its own line instead of being cut off -->
		<span
			class="@container flex w-full min-w-0 py-1 pr-2 pl-3.5 font-medium tabular-nums"
		>
			<span
				class="flex min-w-0 gap-x-1"
				:class="compact ? 'truncate' : 'flex-col @[5.5rem]:flex-row'"
			>
				<span class="text-highlighted whitespace-nowrap">
					{{ minutesToTime(preview.start) }}
				</span>
				<span
					class="whitespace-nowrap"
					:class="
						compact
							? 'text-highlighted'
							: 'text-muted @[5.5rem]:text-highlighted'
					"
				>
					<span :class="!compact && 'hidden @[5.5rem]:inline'">
						–
					</span>
					{{ minutesToTime(preview.end) }}
				</span>
			</span>
		</span>

		<UIcon
			v-if="!dragging && !compact"
			name="i-lucide-x"
			class="text-muted absolute top-1 right-1 size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
		/>

		<span
			data-resize-handle="top"
			class="absolute inset-x-0 top-0 h-2 cursor-ns-resize max-md:h-3"
		/>
		<span
			data-resize-handle="bottom"
			class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize max-md:h-3"
		/>
	</button>
</template>
