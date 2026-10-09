<script setup lang="ts">
	withDefaults(
		defineProps<{
			maxHeight?: number;
		}>(),
		{ maxHeight: 80 },
	);

	const { config, slots, calendar, draft } = useCalendarContext();

	const ALL_DAY_LANE_HEIGHT = 26;
	// The hour the grid opens on, the small hours stay a scroll away
	const START_HOUR = 7;

	const days = calendar.days;
	const dayStrs = computed(() => days.value.map((day) => day.dateStr));

	const gridStyle = computed(() => ({
		gridTemplateColumns: `3.5rem repeat(${days.value.length}, minmax(0, 1fr))`,
	}));

	const hours = computed(() =>
		Array.from(
			{ length: config.hourEnd - config.hourStart - 1 },
			(_, index) => config.hourStart + index + 1,
		),
	);

	// The draft joins the slots it is drawn among, so the day reflows around
	// it the way it would for a real one
	const positionedByDay = computed(() => {
		const all = draft.draftSlot.value
			? [...slots.value, draft.draftSlot.value]
			: slots.value;
		return days.value.map((day) => layoutDay(all, day.dateStr, config));
	});

	// Read-only here: whole-day slots are drawn on the month view only
	const allDayBars = computed(() => layoutAllDay(slots.value, dayStrs.value));

	const allDayLanes = computed(() =>
		allDayBars.value.reduce(
			(lanes, { lane }) => Math.max(lanes, lane + 1),
			0,
		),
	);

	const scroller = useTemplateRef('scroller');

	onMounted(() => {
		scroller.value?.scrollTo({
			// Leaves room for the opening hour's label, centred on its line
			top: Math.max(
				0,
				(START_HOUR - config.hourStart) * HOUR_HEIGHT - 16,
			),
		});
	});

	useSwipe(scroller, {
		threshold: 60,
		onSwipeEnd: (event, direction) => {
			if (calendar.view.value !== 'day' || draft.busy.value) return;
			if ((event.target as HTMLElement).closest('[data-calendar-slot]'))
				return;
			if (direction === 'left') calendar.nextPeriod();
			else if (direction === 'right') calendar.prevPeriod();
		},
	});
</script>

<template>
	<div
		ref="scroller"
		class="border-default relative overflow-auto rounded-lg border [overflow-anchor:none]"
		:style="{ maxHeight: `${maxHeight}dvh` }"
	>
		<div :class="calendar.view.value === 'week' && 'min-w-175'">
			<div
				class="border-default bg-default/85 sticky top-0 z-30 border-b backdrop-blur"
			>
				<div class="grid" :style="gridStyle">
					<div class="bg-default/85 sticky left-0 z-10" />

					<div
						v-for="day in days"
						:key="day.dateStr"
						class="border-default flex items-center justify-center gap-1.5 border-l py-2 text-sm"
					>
						<span class="text-muted capitalize">
							{{ formatWeekday(day.date) }}
						</span>
						<span
							class="flex size-6 items-center justify-center rounded-md font-semibold tabular-nums"
							:class="
								day.isToday
									? 'bg-primary text-inverted'
									: day.isPast
										? 'text-dimmed'
										: 'text-highlighted'
							"
						>
							{{ day.date.getDate() }}
						</span>
					</div>
				</div>

				<div
					v-if="allDayLanes"
					class="border-default grid border-t"
					:style="{
						...gridStyle,
						gridTemplateRows: `repeat(${allDayLanes}, ${ALL_DAY_LANE_HEIGHT}px)`,
					}"
				>
					<span
						class="text-dimmed bg-default/85 sticky left-0 row-span-full self-center pr-2 text-right text-[10px]"
					>
						journée
					</span>

					<div
						v-for="(day, index) in days"
						:key="`all-day-${day.dateStr}`"
						class="border-default row-span-full border-l"
						:style="{ gridColumn: index + 2 }"
					/>

					<CalendarSlotChip
						v-for="bar in allDayBars"
						:key="bar.slot.id"
						:time-slot="bar.slot"
						class="mx-1 self-center"
						:style="{
							gridColumn: `${bar.colStart + 2} / span ${bar.colSpan}`,
							gridRow: bar.lane + 1,
						}"
					/>
				</div>
			</div>

			<div data-week-grid class="grid" :style="gridStyle">
				<div
					class="bg-default sticky left-0 z-20"
					:style="{
						height: `${(config.hourEnd - config.hourStart) * HOUR_HEIGHT}px`,
					}"
				>
					<span
						v-for="hour in hours"
						:key="hour"
						class="text-dimmed absolute right-2 -translate-y-1/2 text-[11px] tabular-nums"
						:style="{
							top: `${(hour - config.hourStart) * HOUR_HEIGHT}px`,
						}"
					>
						{{ formatHour(hour) }}
					</span>
				</div>

				<CalendarDayColumn
					v-for="(day, index) in days"
					:key="day.dateStr"
					:day="day"
					:positioned="positionedByDay[index]!"
				/>
			</div>
		</div>
	</div>
</template>
