<script setup lang="ts">
	interface TimeSlot {
		id: string;
		date: string;
		startTime: string;
		endTime: string;
	}

	interface Participant {
		id: string;
		name: string;
	}

	interface ResponseData {
		participantId: string;
		timeSlotId: string;
		availability: 'yes' | 'maybe' | 'no';
	}

	const props = defineProps<{
		slots: TimeSlot[];
		participants?: Participant[];
		responses?: ResponseData[];
		modelValue: Record<string, 'yes' | 'maybe' | 'no'>;
		readonly?: boolean;
	}>();

	const emit = defineEmits<{
		'update:modelValue': [val: Record<string, 'yes' | 'maybe' | 'no'>];
	}>();

	const HOUR_START = 7;
	const HOUR_END = 22;
	const CELL_HEIGHT = 24;
	const GRANULARITY = 30;

	const currentWeekStart = ref(getInitialWeek());

	function getMonday(d: Date): Date {
		const date = new Date(d);
		const day = date.getDay();
		const diff = date.getDate() - day + (day === 0 ? -6 : 1);
		date.setDate(diff);
		date.setHours(0, 0, 0, 0);
		return date;
	}

	function getInitialWeek(): Date {
		if (props.slots.length > 0) {
			const sorted = [...props.slots].sort((a, b) =>
				a.date.localeCompare(b.date),
			);
			return getMonday(new Date(sorted[0].date + 'T00:00:00'));
		}
		return getMonday(new Date());
	}

	const cellCount = computed(
		() => ((HOUR_END - HOUR_START) * 60) / GRANULARITY,
	);

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
			const totalMins = HOUR_START * 60 + i * GRANULARITY;
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

	function timeToMinutes(time: string): number {
		const [h, m] = time.split(':').map(Number);
		return h * 60 + m;
	}

	const isToday = (dateStr: string) => {
		return dateStr === formatDate(new Date());
	};

	const weeksWithSlots = computed(() => {
		const weeks = new Set<string>();
		for (const slot of props.slots) {
			const d = new Date(slot.date + 'T00:00:00');
			weeks.add(formatDate(getMonday(d)));
		}
		return weeks;
	});

	const hasSlotThisWeek = computed(() => {
		return weeksWithSlots.value.has(formatDate(currentWeekStart.value));
	});

	function getSlotsForDay(dateStr: string) {
		return props.slots
			.filter((s) => s.date === dateStr)
			.map((s) => {
				const startMins =
					timeToMinutes(s.startTime) - HOUR_START * 60;
				const endMins = timeToMinutes(s.endTime) - HOUR_START * 60;
				const top = (startMins / GRANULARITY) * CELL_HEIGHT;
				const height =
					((endMins - startMins) / GRANULARITY) * CELL_HEIGHT;
				const availability = props.modelValue[s.id] || 'no';
				return { ...s, top, height, availability };
			});
	}

	function toggleSlot(slotId: string) {
		if (props.readonly) return;
		const current = props.modelValue[slotId] || 'no';
		let next: 'yes' | 'maybe' | 'no';
		if (current === 'no') next = 'yes';
		else if (current === 'yes') next = 'maybe';
		else next = 'no';

		emit('update:modelValue', { ...props.modelValue, [slotId]: next });
	}

	function getSlotColor(availability: 'yes' | 'maybe' | 'no') {
		if (availability === 'yes')
			return 'bg-green-500 hover:bg-green-600 text-white shadow-sm';
		if (availability === 'maybe')
			return 'bg-amber-400 hover:bg-amber-500 text-white shadow-sm';
		return 'bg-neutral-200 hover:bg-neutral-300 text-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-300';
	}

	function getSlotIcon(availability: 'yes' | 'maybe' | 'no') {
		if (availability === 'yes') return 'i-lucide-check';
		if (availability === 'maybe') return 'i-lucide-help-circle';
		return 'i-lucide-x';
	}

	function getSlotLabel(availability: 'yes' | 'maybe' | 'no') {
		if (availability === 'yes') return 'Disponible';
		if (availability === 'maybe') return 'Peut-être';
		return 'Indisponible';
	}

	function getSlotParticipantSummary(slotId: string) {
		if (!props.responses || !props.participants) return null;
		const slotResponses = props.responses.filter(
			(r) => r.timeSlotId === slotId,
		);
		const yes = slotResponses.filter(
			(r) => r.availability === 'yes',
		).length;
		const maybe = slotResponses.filter(
			(r) => r.availability === 'maybe',
		).length;
		if (yes === 0 && maybe === 0) return null;
		return { yes, maybe, total: props.participants.length };
	}

	const bestSlotId = computed(() => {
		if (
			!props.responses ||
			!props.participants ||
			props.participants.length === 0
		)
			return null;
		let bestId: string | null = null;
		let bestScore = 0;
		for (const slot of props.slots) {
			let score = 0;
			for (const r of props.responses) {
				if (r.timeSlotId !== slot.id) continue;
				if (r.availability === 'yes') score += 2;
				else if (r.availability === 'maybe') score += 1;
			}
			if (score > bestScore) {
				bestScore = score;
				bestId = slot.id;
			}
		}
		return bestId;
	});

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

	function goToSlots() {
		currentWeekStart.value = getInitialWeek();
	}
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
					v-if="!hasSlotThisWeek"
					variant="soft"
					size="sm"
					@click="goToSlots"
				>
					Voir les créneaux
				</UButton>
				<UButton
					v-else
					variant="soft"
					size="sm"
					disabled
				>
					Créneaux visibles
				</UButton>
				<UButton
					icon="i-lucide-chevron-right"
					variant="ghost"
					size="sm"
					@click="nextWeek"
				/>
			</div>
			<span
				class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
			>
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

		<!-- Legend -->
		<div class="mb-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
			<span class="flex items-center gap-1">
				<span class="inline-block h-3 w-3 rounded bg-green-500" />
				Disponible
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block h-3 w-3 rounded bg-amber-400" />
				Peut-être
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block h-3 w-3 rounded bg-neutral-200 dark:bg-neutral-700" />
				Indisponible
			</span>
			<span v-if="!readonly" class="ml-auto italic">
				Cliquez sur un créneau pour changer votre réponse
			</span>
		</div>

		<!-- Calendar Grid -->
		<div
			class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700"
		>
			<div
				class="grid min-w-[700px]"
				style="grid-template-columns: 60px repeat(7, 1fr)"
			>
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
						:style="{
							height: CELL_HEIGHT + 'px',
							paddingTop: '2px',
						}"
						:class="{
							'border-t border-neutral-100 dark:border-neutral-800':
								rowIndex > 0,
						}"
					>
						<span
							v-if="rowIndex % (60 / GRANULARITY) === 0"
						>
							{{ timeLabel.label }}
						</span>
					</div>

					<!-- Day cells -->
					<div
						v-for="day in weekDays"
						:key="day.dateStr + '-' + timeLabel.time"
						class="relative border-r border-neutral-100 last:border-r-0 dark:border-neutral-800"
						:style="{ height: CELL_HEIGHT + 'px' }"
						:class="{
							'border-t border-neutral-200 dark:border-neutral-700':
								rowIndex % (60 / GRANULARITY) === 0 &&
								rowIndex > 0,
							'border-t border-neutral-100 dark:border-neutral-800':
								rowIndex % (60 / GRANULARITY) !== 0 &&
								rowIndex > 0,
						}"
					>
						<!-- Slot blocks -->
						<template v-if="rowIndex === 0">
							<div
								v-for="slot in getSlotsForDay(day.dateStr)"
								:key="slot.id"
								class="absolute right-0.5 left-0.5 z-20 flex cursor-pointer flex-col items-center justify-center rounded transition-all"
								:class="[
									getSlotColor(slot.availability),
									{
										'ring-primary-500 ring-2 ring-offset-1':
											bestSlotId === slot.id,
									},
									readonly
										? 'cursor-default'
										: 'cursor-pointer',
								]"
								:style="{
									top: slot.top + 'px',
									height: slot.height + 'px',
								}"
								@click="toggleSlot(slot.id)"
							>
								<div
									class="flex items-center gap-0.5 text-[10px] font-medium leading-tight"
								>
									<UIcon
										:name="getSlotIcon(slot.availability)"
										class="h-3 w-3 shrink-0"
									/>
									<span class="truncate">
										{{ slot.startTime }}–{{ slot.endTime }}
									</span>
								</div>
								<div
									v-if="slot.height >= 36"
									class="text-[9px] leading-tight opacity-80"
								>
									{{ getSlotLabel(slot.availability) }}
								</div>
								<!-- Participant counts -->
								<div
									v-if="
										slot.height >= 48 &&
										getSlotParticipantSummary(slot.id)
									"
									class="mt-0.5 text-[9px] leading-tight opacity-70"
								>
									{{
										getSlotParticipantSummary(slot.id)!.yes
									}}
									oui
									<template
										v-if="
											getSlotParticipantSummary(slot.id)!
												.maybe > 0
										"
									>
										·
										{{
											getSlotParticipantSummary(slot.id)!
												.maybe
										}}
										p-ê
									</template>
								</div>
							</div>
						</template>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>
