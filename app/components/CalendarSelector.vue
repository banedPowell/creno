<script setup lang="ts">
	export interface TimeSlotData {
		date: string;
		startTime: string;
		endTime: string;
	}

	const props = defineProps<{
		modelValue: TimeSlotData[];
		slotDuration: number;
	}>();

	const emit = defineEmits<{
		'update:modelValue': [slots: TimeSlotData[]];
	}>();

	const HOUR_START = 7;
	const HOUR_END = 22;
	const CELL_HEIGHT = 24;

	const currentWeekStart = ref(getMonday(new Date()));

	function getMonday(d: Date): Date {
		const date = new Date(d);
		const day = date.getDay();
		const diff = date.getDate() - day + (day === 0 ? -6 : 1);
		date.setDate(diff);
		date.setHours(0, 0, 0, 0);
		return date;
	}

	const granularity = computed(() => {
		if (props.slotDuration <= 30) return 30;
		if (props.slotDuration <= 60) return 30;
		return 30;
	});

	const totalMinutes = computed(() => (HOUR_END - HOUR_START) * 60);
	const cellCount = computed(() => totalMinutes.value / granularity.value);

	const weekDays = computed(() => {
		const days: { date: Date; label: string; dateStr: string }[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(currentWeekStart.value);
			d.setDate(d.getDate() + i);
			days.push({
				date: d,
				label: d.toLocaleDateString('fr-FR', {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
				}),
				dateStr: formatDate(d),
			});
		}
		return days;
	});

	const timeLabels = computed(() => {
		const labels: { time: string; label: string; index: number }[] = [];
		for (let i = 0; i < cellCount.value; i++) {
			const totalMins = HOUR_START * 60 + i * granularity.value;
			const h = Math.floor(totalMins / 60);
			const m = totalMins % 60;
			labels.push({
				time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
				label:
					m === 0
						? `${String(h).padStart(2, '0')}:00`
						: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
				index: i,
			});
		}
		return labels;
	});

	function formatDate(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function minutesToTime(mins: number): string {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function timeToMinutes(time: string): number {
		const [h, m] = time.split(':').map(Number);
		return h * 60 + m;
	}

	const isDragging = ref(false);
	const dragDateStr = ref('');
	const dragStartIndex = ref(0);
	const dragCurrentIndex = ref(0);

	function onCellMouseDown(dateStr: string, cellIndex: number) {
		isDragging.value = true;
		dragDateStr.value = dateStr;
		dragStartIndex.value = cellIndex;
		dragCurrentIndex.value = cellIndex;
	}

	function onCellMouseEnter(dateStr: string, cellIndex: number) {
		if (!isDragging.value) return;
		if (dateStr !== dragDateStr.value) return;
		dragCurrentIndex.value = cellIndex;
	}

	function onMouseUp() {
		if (!isDragging.value) return;
		isDragging.value = false;

		const minIdx = Math.min(dragStartIndex.value, dragCurrentIndex.value);
		const maxIdx = Math.max(dragStartIndex.value, dragCurrentIndex.value);

		const startMins = HOUR_START * 60 + minIdx * granularity.value;
		let endMins = HOUR_START * 60 + (maxIdx + 1) * granularity.value;

		const slotCells = Math.ceil(props.slotDuration / granularity.value);
		if (maxIdx - minIdx + 1 < slotCells) {
			endMins = startMins + props.slotDuration;
		}

		if (endMins > HOUR_END * 60) {
			endMins = HOUR_END * 60;
		}

		const newSlot: TimeSlotData = {
			date: dragDateStr.value,
			startTime: minutesToTime(startMins),
			endTime: minutesToTime(endMins),
		};

		const existing = props.modelValue.find(
			(s) =>
				s.date === newSlot.date &&
				s.startTime === newSlot.startTime &&
				s.endTime === newSlot.endTime,
		);

		if (existing) {
			emit(
				'update:modelValue',
				props.modelValue.filter((s) => s !== existing),
			);
		} else {
			const overlapping = props.modelValue.filter(
				(s) =>
					s.date === newSlot.date &&
					timeToMinutes(s.startTime) < timeToMinutes(newSlot.endTime) &&
					timeToMinutes(s.endTime) > timeToMinutes(newSlot.startTime),
			);
			const filtered = props.modelValue.filter(
				(s) => !overlapping.includes(s),
			);
			emit('update:modelValue', [...filtered, newSlot]);
		}
	}

	function isDragHighlight(dateStr: string, cellIndex: number): boolean {
		if (!isDragging.value) return false;
		if (dateStr !== dragDateStr.value) return false;
		const minIdx = Math.min(dragStartIndex.value, dragCurrentIndex.value);
		const maxIdx = Math.max(dragStartIndex.value, dragCurrentIndex.value);
		return cellIndex >= minIdx && cellIndex <= maxIdx;
	}

	function getSlotsForDay(dateStr: string) {
		return props.modelValue
			.filter((s) => s.date === dateStr)
			.map((s) => {
				const startMins = timeToMinutes(s.startTime) - HOUR_START * 60;
				const endMins = timeToMinutes(s.endTime) - HOUR_START * 60;
				const top = (startMins / granularity.value) * CELL_HEIGHT;
				const height =
					((endMins - startMins) / granularity.value) * CELL_HEIGHT;
				return { ...s, top, height };
			});
	}

	function removeSlot(slot: TimeSlotData) {
		emit(
			'update:modelValue',
			props.modelValue.filter(
				(s) =>
					!(
						s.date === slot.date &&
						s.startTime === slot.startTime &&
						s.endTime === slot.endTime
					),
			),
		);
	}

	function prevWeek() {
		const d = new Date(currentWeekStart.value);
		d.setDate(d.getDate() - 7);
		currentWeekStart.value = d;
	}

	function nextWeek() {
		const d = new Date(currentWeekStart.value);
		d.setDate(d.getDate() + 7);
		currentWeekStart.value = d;
	}

	function goToToday() {
		currentWeekStart.value = getMonday(new Date());
	}

	const isToday = (dateStr: string) => {
		return dateStr === formatDate(new Date());
	};

	const calendarRef = ref<HTMLElement | null>(null);

	function getCellFromTouch(touch: Touch): { dateStr: string; cellIndex: number } | null {
		const el = document.elementFromPoint(touch.clientX, touch.clientY);
		if (!el) return null;
		const dateStr = (el as HTMLElement).dataset?.dateStr;
		const cellIndex = (el as HTMLElement).dataset?.cellIndex;
		if (dateStr && cellIndex !== undefined) {
			return { dateStr, cellIndex: parseInt(cellIndex) };
		}
		return null;
	}

	function onTouchStart(e: TouchEvent, dateStr: string, cellIndex: number) {
		e.preventDefault();
		onCellMouseDown(dateStr, cellIndex);
	}

	function onTouchMove(e: TouchEvent) {
		if (!isDragging.value) return;
		e.preventDefault();
		const touch = e.touches[0];
		const cell = getCellFromTouch(touch);
		if (cell) {
			onCellMouseEnter(cell.dateStr, cell.cellIndex);
		}
	}

	function onTouchEnd() {
		onMouseUp();
	}

	onMounted(() => {
		document.addEventListener('mouseup', onMouseUp);
		document.addEventListener('touchend', onTouchEnd);
		document.addEventListener('touchmove', onTouchMove, { passive: false });
	});

	onUnmounted(() => {
		document.removeEventListener('mouseup', onMouseUp);
		document.removeEventListener('touchend', onTouchEnd);
		document.removeEventListener('touchmove', onTouchMove);
	});
</script>

<template>
	<div class="select-none">
		<!-- Navigation -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<UButton
					icon="i-lucide-chevron-left"
					variant="ghost"
					size="sm"
					@click="prevWeek"
				/>
				<UButton
					variant="soft"
					size="sm"
					@click="goToToday"
				>
					Aujourd'hui
				</UButton>
				<UButton
					icon="i-lucide-chevron-right"
					variant="ghost"
					size="sm"
					@click="nextWeek"
				/>
			</div>
			<span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
				{{
					currentWeekStart.toLocaleDateString('fr-FR', {
						day: 'numeric',
						month: 'long',
						year: 'numeric',
					})
				}}
				—
				{{
					(() => {
						const end = new Date(currentWeekStart);
						end.setDate(end.getDate() + 6);
						return end.toLocaleDateString('fr-FR', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						});
					})()
				}}
			</span>
		</div>

		<!-- Calendar Grid -->
		<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
			<div class="grid min-w-[700px]" style="grid-template-columns: 60px repeat(7, 1fr)">
				<!-- Header row -->
				<div
					class="sticky top-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800"
				/>
				<div
					v-for="day in weekDays"
					:key="day.dateStr"
					class="sticky top-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 p-2 text-center text-xs font-medium last:border-r-0 dark:border-neutral-700 dark:bg-neutral-800"
					:class="{
						'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300':
							isToday(day.dateStr),
					}"
				>
					{{ day.label }}
				</div>

				<!-- Time rows -->
				<template
					v-for="(timeLabel, rowIndex) in timeLabels"
					:key="timeLabel.time"
				>
					<!-- Time label -->
					<div
						class="border-r border-neutral-200 px-1 text-right text-[10px] leading-none text-neutral-400 dark:border-neutral-700"
						:style="{ height: CELL_HEIGHT + 'px', paddingTop: '2px' }"
						:class="{
							'border-t border-neutral-100 dark:border-neutral-800':
								rowIndex > 0,
						}"
					>
						<span v-if="rowIndex % (60 / granularity) === 0">
							{{ timeLabel.label }}
						</span>
					</div>

					<!-- Day cells -->
					<div
						v-for="day in weekDays"
						:key="day.dateStr + '-' + timeLabel.time"
						class="relative cursor-crosshair border-r border-neutral-100 last:border-r-0 dark:border-neutral-800"
						:style="{ height: CELL_HEIGHT + 'px' }"
						:class="{
							'border-t border-neutral-200 dark:border-neutral-700':
								rowIndex % (60 / granularity) === 0 && rowIndex > 0,
							'border-t border-neutral-100 dark:border-neutral-800':
								rowIndex % (60 / granularity) !== 0 && rowIndex > 0,
							'bg-primary-100/60 dark:bg-primary-900/30': isDragHighlight(
								day.dateStr,
								rowIndex,
							),
						}"
						:data-date-str="day.dateStr"
						:data-cell-index="rowIndex"
						@mousedown.prevent="onCellMouseDown(day.dateStr, rowIndex)"
						@mouseenter="onCellMouseEnter(day.dateStr, rowIndex)"
						@touchstart="onTouchStart($event, day.dateStr, rowIndex)"
					>
						<!-- Slot blocks (only render on first cell row) -->
						<template v-if="rowIndex === 0">
							<div
								v-for="(slot, sIdx) in getSlotsForDay(day.dateStr)"
								:key="sIdx"
								class="bg-primary-500 hover:bg-primary-600 absolute right-0.5 left-0.5 z-20 cursor-pointer rounded px-1 py-0.5 text-[10px] leading-tight text-white shadow-sm transition-colors"
								:style="{
									top: slot.top + 'px',
									height: slot.height + 'px',
								}"
								@click.stop="removeSlot(slot)"
								@mousedown.stop
							>
								<div class="truncate font-medium">
									{{ slot.startTime }} – {{ slot.endTime }}
								</div>
							</div>
						</template>
					</div>
				</template>
			</div>
		</div>

		<p class="mt-2 text-xs text-neutral-500">
			Cliquez et glissez pour sélectionner un créneau. Cliquez sur un
			créneau existant pour le supprimer.
		</p>
	</div>
</template>
