<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import type { PositionedSlot } from '~/utils/calendarLayout';

	const props = defineProps<{
		positioned: PositionedSlot;
	}>();

	const haptic = useWebHaptics();

	const slot = computed(() => props.positioned.slot);

	const {
		status,
		yes,
		maybe,
		isBest,
		isChosen,
		isSelected,
		isPast,
		isDimmed,
		disabled,
		tooltip,
		describe,
		toggle,
	} = useSlotVote(slot);

	const badged = computed(() => isBest.value || isChosen.value);

	const { highlightedSlotId } = useCalendarContext();

	// Dimmed but solid, the grid stays hidden behind it
	const faded = computed(() => isDimmed.value || isPast.value);
	const highlighted = computed(
		() => highlightedSlotId.value === slot.value.id,
	);

	const element = useTemplateRef<HTMLElement>('element');
	watch(
		highlighted,
		(value) => {
			if (value)
				nextTick(() =>
					element.value?.scrollIntoView?.({
						block: 'center',
						behavior: 'smooth',
					}),
				);
		},
		{ immediate: true },
	);

	const times = computed(
		() => `${slot.value.startTime} – ${slot.value.endTime}`,
	);

	const compact = computed(
		() =>
			timeToMinutes(slot.value.endTime) -
				timeToMinutes(slot.value.startTime) <
			45,
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
			ref="element"
			type="button"
			data-calendar-slot
			:data-vote="status"
			:data-best="isBest || undefined"
			:data-chosen="isChosen || undefined"
			:data-selected="isSelected || undefined"
			:aria-pressed="isSelected || undefined"
			class="group absolute z-5 flex touch-manipulation overflow-hidden rounded-md text-left text-xs ring transition select-none ring-inset focus-visible:outline-2 focus-visible:outline-offset-1"
			:class="[
				compact ? 'items-center' : 'flex-col',
				compact && badged && 'pb-4',
				isSelected && 'outline-primary z-10 outline-2 outline-offset-1',
				faded
					? 'bg-muted ring-accented'
					: status === 'yes'
						? 'bg-vote-yes ring-success/60'
						: status === 'maybe'
							? 'bg-vote-maybe ring-warning/60'
							: 'bg-default ring-accented',
				disabled
					? 'cursor-default'
					: faded
						? 'hover:bg-elevated cursor-pointer'
						: status === 'yes'
							? 'hover:bg-vote-yes-hover cursor-pointer'
							: status === 'maybe'
								? 'hover:bg-vote-maybe-hover cursor-pointer'
								: 'hover:bg-elevated cursor-pointer',
				faded && '[&>*]:opacity-50',
				highlighted && 'animate-slot-reveal z-10',
			]"
			:data-faded="faded || undefined"
			:data-highlighted="highlighted || undefined"
			:style="slotBlockStyle(positioned)"
			:aria-label="describe(times)"
			:aria-disabled="disabled || undefined"
			@click.stop="onClick"
		>
			<span
				class="absolute inset-y-1 left-1 w-1 rounded-full"
				:class="
					isChosen
						? 'bg-success'
						: isBest
							? 'bg-primary'
							: status === 'yes'
								? 'bg-success'
								: status === 'maybe'
									? 'bg-warning'
									: 'bg-accented'
				"
			/>

			<span
				class="flex w-full min-w-0 items-center gap-1 py-1 pr-1.5 pl-3.5 font-medium tabular-nums"
			>
				<span class="text-highlighted truncate">{{ times }}</span>
				<UIcon
					v-if="status !== 'none'"
					:name="
						status === 'yes'
							? 'i-lucide-check'
							: 'i-lucide-circle-help'
					"
					class="ml-auto size-3.5 shrink-0"
					:class="status === 'yes' ? 'text-success' : 'text-warning'"
				/>
			</span>

			<span
				v-if="badged || (!compact && (yes.length || maybe.length))"
				class="absolute bottom-1 left-3.5 flex items-center gap-1.5"
			>
				<span
					v-if="isChosen"
					data-chosen-badge
					class="bg-success text-inverted flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] leading-none font-semibold"
				>
					<UIcon name="i-lucide-calendar-check" class="size-2.5" />
					<span :class="compact && 'sr-only'">Retenu</span>
				</span>
				<span
					v-else-if="isBest"
					data-best-badge
					class="bg-primary text-inverted flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] leading-none font-semibold"
				>
					<UIcon name="i-lucide-star" class="size-2.5" />
					<span :class="compact && 'sr-only'">Top</span>
				</span>
				<span
					v-if="!compact && (yes.length || maybe.length)"
					data-vote-tally
					class="text-muted flex items-center gap-2 text-[11px] tabular-nums"
				>
					<span v-if="yes.length" class="flex items-center gap-0.5">
						<UIcon name="i-lucide-check" class="size-3" />
						{{ yes.length }}
					</span>
					<span v-if="maybe.length" class="flex items-center gap-0.5">
						<UIcon name="i-lucide-circle-help" class="size-3" />
						{{ maybe.length }}
					</span>
				</span>
			</span>
		</button>
	</UTooltip>
</template>
