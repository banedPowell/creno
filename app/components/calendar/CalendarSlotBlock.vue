<script setup lang="ts">
	import type { PositionedSlot } from '~/utils/calendarLayout';

	const props = defineProps<{
		positioned: PositionedSlot;
	}>();

	const { config, slotActions, now, vote, highlightedSlotId } =
		useCalendarContext();

	const slot = computed(() => props.positioned.slot);
	// Only the organiser's calendar has both: answers on the block, and edits
	const look = vote ? useSlotVote(slot) : null;
	const picking = computed(() => !!vote?.picking);
	const faded = computed(
		() => !!look && (look.isDimmed.value || look.isPast.value),
	);
	const highlighted = computed(
		() => !!look && highlightedSlotId.value === slot.value.id,
	);
	const badged = computed(
		() => !!look && (look.isBest.value || look.isChosen.value),
	);

	const element = useTemplateRef<HTMLElement>('element');
	watch(highlighted, (value) => {
		if (value)
			nextTick(() =>
				element.value?.scrollIntoView?.({
					block: 'center',
					behavior: 'smooth',
				}),
			);
	});

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
		if (vote?.picking) vote.picking.select(slot.value.id);
		else slotActions.removeSlot(slot.value.id);
	};

	const remove = () => slotActions.removeSlot(slot.value.id);
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
			ref="element"
			type="button"
			data-calendar-slot
			:data-best="look?.isBest.value || undefined"
			:data-chosen="look?.isChosen.value || undefined"
			:data-selected="look?.isSelected.value || undefined"
			:data-highlighted="highlighted || undefined"
			:data-faded="faded || undefined"
			class="group absolute flex touch-none overflow-hidden rounded-md text-left text-xs ring transition-colors select-none ring-inset focus-visible:outline-2 focus-visible:outline-offset-1"
			:class="[
				dragging
					? 'z-20 cursor-grabbing shadow-lg'
					: 'z-5 cursor-pointer',
				compact ? 'items-center' : 'flex-col',
				compact && badged && 'pb-4',
				look?.isSelected.value &&
					'outline-primary z-10 outline-2 outline-offset-1',
				look
					? faded
						? 'bg-muted ring-accented hover:bg-elevated'
						: 'bg-default ring-accented hover:bg-elevated'
					: [
							'bg-elevated hover:bg-accented',
							isPast ? 'ring-error opacity-60' : 'ring-accented',
						],
				faded && '[&>*]:opacity-50',
				highlighted && 'animate-slot-reveal z-10',
			]"
			:style="style"
			:aria-label="
				look
					? look.describe(times)
					: `Créneau ${times}${isPast ? ', déjà passé' : ''}, cliquer pour supprimer`
			"
			:data-past="isPast || undefined"
			@click.stop="onClick"
			@pointerdown="onPointerdown"
			@pointermove="onPointermove"
			@pointerup="onPointerup"
			@pointercancel="onPointercancel"
		>
			<span
				class="absolute inset-y-1 left-1 w-1 rounded-full"
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

			<!-- Next to another slot the block gets narrow, the end time drops to
			its own line instead of being cut off -->
			<span
				class="@container flex w-full min-w-0 py-1 pl-3.5 font-medium tabular-nums"
				:class="picking && !compact ? 'pr-6' : 'pr-2'"
			>
				<span
					class="flex min-w-0 gap-x-1"
					:class="
						compact ? 'truncate' : 'flex-col @[5.5rem]:flex-row'
					"
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

			<button
				v-if="picking && !dragging && !compact"
				type="button"
				data-remove-slot
				aria-label="Retirer ce créneau"
				class="text-muted hover:bg-accented absolute top-0.5 right-0.5 z-20 inline-flex size-4 items-center justify-center rounded p-0"
				@click.stop="remove"
				@pointerdown.stop
			>
				<UIcon name="i-lucide-x" class="size-3.5" />
			</button>
			<UIcon
				v-else-if="!dragging && !compact"
				name="i-lucide-x"
				class="text-muted absolute top-1 right-1 size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
			/>

			<span
				v-if="
					look &&
					(badged ||
						(!compact &&
							(look.yes.value.length || look.maybe.value.length)))
				"
				class="absolute bottom-1 left-3.5 flex items-center gap-1.5"
			>
				<span
					v-if="look.isChosen.value"
					data-chosen-badge
					class="bg-success text-inverted flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] leading-none font-semibold"
				>
					<UIcon name="i-lucide-calendar-check" class="size-2.5" />
					<span :class="compact && 'sr-only'">Retenu</span>
				</span>
				<span
					v-else-if="look.isBest.value"
					data-best-badge
					class="bg-primary text-inverted flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] leading-none font-semibold"
				>
					<UIcon name="i-lucide-star" class="size-2.5" />
					<span :class="compact && 'sr-only'">Top</span>
				</span>
				<span
					v-if="
						!compact &&
						(look.yes.value.length || look.maybe.value.length)
					"
					data-vote-tally
					class="text-muted flex items-center gap-2 text-[11px] tabular-nums"
				>
					<span
						v-if="look.yes.value.length"
						class="flex items-center gap-0.5"
					>
						<UIcon name="i-lucide-check" class="size-3" />
						{{ look.yes.value.length }}
					</span>
					<span
						v-if="look.maybe.value.length"
						class="flex items-center gap-0.5"
					>
						<UIcon name="i-lucide-circle-help" class="size-3" />
						{{ look.maybe.value.length }}
					</span>
				</span>
			</span>

			<span
				data-resize-handle="top"
				class="absolute inset-x-0 top-0 h-2 cursor-ns-resize max-md:h-3"
			/>
			<span
				data-resize-handle="bottom"
				class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize max-md:h-3"
			/>
		</button>
	</UTooltip>
</template>
