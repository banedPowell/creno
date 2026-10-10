<script setup lang="ts">
	import { CalendarSlotChip, CalendarVoteChip } from '#components';
	import type { CalendarTimeSlot } from '~/types/calendar';

	// A week is one grid: the day numbers, then a fixed stack of slots each day
	// fills on its own. Whole-day bars span columns and hold their lane across
	// the days they cover, the other days keep those slots for timed ones
	const SLOT_HEIGHT = 22;
	const MAX_SLOTS = 4;
	// Bars never take the last slot, so a day always has room for a timed
	// slot or the "+N" button
	const MAX_LANES = MAX_SLOTS - 1;

	const props = defineProps<{
		weekStart: Date;
		month: number;
	}>();

	const { slots, calendar, draft, vote } = useCalendarContext();

	const SlotChip = vote ? CalendarVoteChip : CalendarSlotChip;

	const days = computed(() =>
		eachDay(props.weekStart, 7).map((date) => toCalendarDay(date)),
	);
	const dayStrs = computed(() => days.value.map((day) => day.dateStr));

	const gridStyle = {
		gridTemplateRows: [
			'auto',
			...Array.from({ length: MAX_LANES }, () => `${SLOT_HEIGHT}px`),
			`minmax(${SLOT_HEIGHT}px, 1fr)`,
		].join(' '),
	};

	// The draft is drawn among the bars, a row it does not reach keeps its
	// layout untouched
	const lanes = computed(() => {
		const ghost = draft.draftSlot.value;
		const all = ghost?.allDay ? [...slots.value, ghost] : slots.value;
		return layoutAllDay(all, dayStrs.value).map((bar) =>
			bar.slot.id === DRAFT_SLOT_ID
				? { ...bar, lane: Math.min(bar.lane, MAX_LANES - 1) }
				: bar,
		);
	});

	const bars = computed(() =>
		lanes.value
			.filter((bar) => bar.lane < MAX_LANES)
			.map((bar) => ({
				...bar,
				continuesBefore: bar.slot.startDate < dayStrs.value[0]!,
				continuesAfter: bar.slot.endDate > dayStrs.value[6]!,
			})),
	);

	// Timed slots fill the slots the day's bars leave free, top first, and the
	// last free slot becomes the "+N" button when they overflow
	const cells = computed(() =>
		days.value.map((day, index) => {
			const timed = slots.value
				.filter(
					(slot) => !slot.allDay && slot.startDate === day.dateStr,
				)
				.sort((a, b) => a.startTime.localeCompare(b.startTime));

			const covering = lanes.value.filter(
				(bar) =>
					index >= bar.colStart && index < bar.colStart + bar.colSpan,
			);
			const occupied = new Set(
				covering
					.filter((bar) => bar.lane < MAX_LANES)
					.map((bar) => bar.lane),
			);
			const hiddenBars = covering.filter((bar) => bar.lane >= MAX_LANES);
			const free = Array.from(
				{ length: MAX_SLOTS },
				(_, slot) => slot,
			).filter((slot) => !occupied.has(slot));

			const overflows =
				hiddenBars.length > 0 || timed.length > free.length;
			const visible = timed.slice(
				0,
				overflows ? Math.max(free.length - 1, 0) : free.length,
			);
			const moreSlot = free[visible.length];

			return {
				day,
				timed: visible.map((slot, position) => ({
					slot,
					row: free[position]!,
				})),
				more:
					overflows && moreSlot !== undefined
						? {
								row: moreSlot,
								hidden:
									hiddenBars.length +
									timed.length -
									visible.length,
								slots: [
									...covering
										.map((bar) => bar.slot)
										.filter(
											(slot) => slot.id !== DRAFT_SLOT_ID,
										),
									...timed,
								] as CalendarTimeSlot[],
							}
						: null,
			};
		}),
	);
</script>

<template>
	<div
		class="border-default grid min-h-28 grid-cols-7 border-b"
		:style="gridStyle"
	>
		<!-- Behind everything so a gesture on empty space anywhere in the day
			lands here. They carry the day a drag reads back off them, which is
			what lets it run into the rows below -->
		<div
			v-for="({ day }, index) in cells"
			:key="`day-${day.dateStr}`"
			:data-date="day.dateStr"
			class="border-default row-span-full"
			:class="[
				index !== 0 && 'border-l',
				day.isPast && 'bg-muted/50',
				vote || day.isPast ? 'cursor-default' : 'cursor-cell',
			]"
			:style="{ gridColumn: index + 1 }"
			@pointerdown="
				draft.onGridPointerdown($event, {
					kind: 'month',
					dateStr: day.dateStr,
				})
			"
		/>

		<button
			v-for="({ day }, index) in cells"
			:key="`number-${day.dateStr}`"
			type="button"
			data-calendar-slot
			class="row-start-1 m-1 inline-flex h-6 min-w-6 items-center justify-center justify-self-end rounded-md px-1 text-xs font-semibold tabular-nums transition-colors select-none focus-visible:outline-2"
			:class="
				day.isToday
					? 'bg-primary text-inverted'
					: day.date.getMonth() !== month || day.isPast
						? 'text-dimmed hover:bg-elevated'
						: 'text-highlighted hover:bg-elevated'
			"
			:style="{ gridColumn: index + 1 }"
			:aria-label="`Ouvrir le ${formatFullDate(day.date)}`"
			@click="calendar.openDay(day.date)"
		>
			{{ day.date.getDate() }}
		</button>

		<component
			:is="SlotChip"
			v-for="bar in bars"
			:key="bar.slot.id"
			:time-slot="bar.slot"
			:ghost="bar.slot.id === DRAFT_SLOT_ID || undefined"
			:continues-before="bar.continuesBefore"
			:continues-after="bar.continuesAfter"
			class="mx-1 self-start"
			:class="[
				bar.continuesBefore && 'ml-0',
				bar.continuesAfter && 'mr-0',
			]"
			:style="{
				gridColumn: `${bar.colStart + 1} / span ${bar.colSpan}`,
				gridRow: bar.lane + 2,
			}"
		/>

		<template
			v-for="({ day, timed, more }, index) in cells"
			:key="`slots-${day.dateStr}`"
		>
			<component
				:is="SlotChip"
				v-for="{ slot, row } in timed"
				:key="slot.id"
				:time-slot="slot"
				class="mx-1 self-start"
				:style="{ gridColumn: index + 1, gridRow: row + 2 }"
			/>

			<UPopover
				v-if="more"
				:content="{ side: 'right' }"
				:ui="{ content: 'flex w-56 flex-col gap-0.5 p-2' }"
			>
				<UButton
					data-calendar-slot
					color="neutral"
					variant="ghost"
					size="xs"
					class="text-muted mx-1 self-start px-1.5 py-0.5 font-normal"
					:style="{ gridColumn: index + 1, gridRow: more.row + 2 }"
					:label="`+${more.hidden}`"
				/>

				<template #content>
					<component
						:is="SlotChip"
						v-for="slot in more.slots"
						:key="slot.id"
						:time-slot="slot"
					/>
				</template>
			</UPopover>
		</template>
	</div>
</template>
