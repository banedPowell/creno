<script setup lang="ts">
	import type { CalendarDay } from '~/types/calendar';
	import type { PositionedSlot } from '~/utils/calendarLayout';

	const props = defineProps<{
		day: CalendarDay;
		positioned: PositionedSlot[];
	}>();

	const { config, draft, now, vote } = useCalendarContext();
	// An organiser picking a slot still draws and moves the others
	const answering = computed(() => !!vote && !vote.picking);

	const hours = computed(() => config.hourEnd - config.hourStart);

	const earliest = computed(() =>
		earliestMinutes(props.day.dateStr, now.value, config.snapMinutes),
	);

	// The part of today already gone, shaded like a past day
	const pastHeight = computed(() => {
		if (!props.day.isToday) return 0;
		const minutes = Math.min(
			Math.max(earliest.value, config.hourStart * 60),
			config.hourEnd * 60,
		);
		return (minutes - config.hourStart * 60) * PX_PER_MINUTE;
	});

	// The pointer sits where nothing can be drawn
	const overPast = shallowRef(false);

	const lines = computed(() =>
		Array.from({ length: hours.value * 2 - 1 }, (_, index) => {
			const isHour = (index + 1) % 2 === 0;
			return {
				top: ((index + 1) / 2) * HOUR_HEIGHT,
				class: isHour
					? 'border-default'
					: 'border-default/40 border-dashed',
			};
		}),
	);

	// The step a click or a drag would start on, under the mouse
	const hoverMinutes = shallowRef<number | null>(null);

	const onPointermove = (event: PointerEvent) => {
		if (
			answering.value ||
			event.pointerType !== 'mouse' ||
			(event.target as HTMLElement).closest('[data-calendar-slot]')
		) {
			hoverMinutes.value = null;
			overPast.value = false;
			return;
		}

		const rect = (
			event.currentTarget as HTMLElement
		).getBoundingClientRect();
		const minutes = minutesInColumn(
			event.clientY,
			rect,
			config,
			config.snapMinutes,
			'floor',
		);
		const step = Math.min(
			minutes,
			config.hourEnd * 60 - config.snapMinutes,
		);
		overPast.value = step < earliest.value;
		hoverMinutes.value = overPast.value ? null : step;
	};

	const onPointerleave = () => {
		hoverMinutes.value = null;
		overPast.value = false;
	};

	const hoverBand = computed(() => {
		if (hoverMinutes.value === null || draft.busy.value) return null;
		return {
			top: (hoverMinutes.value - config.hourStart * 60) * PX_PER_MINUTE,
			height: config.snapMinutes * PX_PER_MINUTE,
			label: minutesToTime(hoverMinutes.value),
		};
	});
</script>

<template>
	<!-- Its top is the first visible hour, the gestures read a time straight
		off the pointer -->
	<div
		data-day-column
		:data-date="day.dateStr"
		class="border-default relative border-l"
		:class="[
			day.isPast && 'bg-muted/50',
			answering || day.isPast || overPast
				? 'cursor-default'
				: 'cursor-cell',
		]"
		:style="{ height: `${hours * HOUR_HEIGHT}px` }"
		@pointerdown="
			draft.onGridPointerdown($event, {
				kind: 'timed',
				dateStr: day.dateStr,
			})
		"
		@pointermove="onPointermove"
		@pointerleave="onPointerleave"
	>
		<div
			v-if="pastHeight"
			data-past-zone
			class="bg-muted/50 pointer-events-none absolute inset-x-0 top-0"
			:style="{ height: `${pastHeight}px` }"
		/>
		<div
			v-for="line in lines"
			:key="line.top"
			class="pointer-events-none absolute inset-x-0 border-t"
			:class="line.class"
			:style="{ top: `${line.top}px` }"
		/>

		<div
			v-if="hoverBand"
			class="bg-accented/60 pointer-events-none absolute inset-x-0.5 flex items-center rounded-md px-1.5"
			:style="{
				top: `${hoverBand.top}px`,
				height: `${hoverBand.height}px`,
			}"
		>
			<span class="text-muted text-[10px] leading-none tabular-nums">
				{{ hoverBand.label }}
			</span>
		</div>

		<template v-for="item in positioned" :key="item.slot.id">
			<div
				v-if="item.slot.id === DRAFT_SLOT_ID"
				class="bg-primary/10 border-primary/40 pointer-events-none absolute z-10 overflow-hidden rounded-md border border-dashed"
				:style="slotBlockStyle(item)"
			>
				<span
					class="text-highlighted block truncate px-2 py-1 text-xs font-medium tabular-nums"
				>
					{{ item.slot.startTime }} – {{ item.slot.endTime }}
				</span>
			</div>
			<CalendarVoteBlock v-else-if="answering" :positioned="item" />
			<CalendarSlotBlock v-else :positioned="item" />
		</template>

		<ClientOnly>
			<CalendarNowIndicator v-if="day.isToday" />
		</ClientOnly>
	</div>
</template>
