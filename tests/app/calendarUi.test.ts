import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { UApp } from '#components';
import PollCalendar from '../../app/components/calendar/PollCalendar.vue';
import CalendarRoot from '../../app/components/calendar/CalendarRoot.vue';
import type {
	CalendarTimeSlot,
	CalendarVoteState,
	SlotVoter,
	VoteStatus,
} from '../../app/types/calendar';
import {
	clickColumn,
	column,
	dragColumn,
	mockColumnGeometry,
	movePointer,
	pressColumn,
	releasePointer,
} from './helpers/calendarDom';

// Friday 9 October 2026, 10:00: the week runs Monday 5 to Sunday 11
const NOW = new Date(2026, 9, 9, 10, 0);
const TODAY = '2026-10-09';
const TOMORROW = '2026-10-10';
const YESTERDAY = '2026-10-08';

const timed = (
	id: string,
	date: string,
	startTime: string,
	endTime: string,
): CalendarTimeSlot => ({
	id,
	startDate: date,
	endDate: date,
	startTime,
	endTime,
});

let wrapper: VueWrapper | undefined;

const mountCalendar = async (initial: CalendarTimeSlot[] = []) => {
	const slots = ref<CalendarTimeSlot[]>(initial);
	// UApp provides the tooltips the header buttons use
	const Harness = defineComponent({
		setup: () => () =>
			h(UApp, null, {
				default: () =>
					h(PollCalendar, {
						modelValue: slots.value,
						'onUpdate:modelValue': (value: CalendarTimeSlot[]) => {
							slots.value = value;
						},
					}),
			}),
	});
	wrapper = await mountSuspended(Harness);
	return { wrapper, slots };
};

const blocks = () => wrapper!.findAll('[data-calendar-slot]');

const pressKey = async (key: string) => {
	document.dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true }),
	);
	await nextTick();
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	mockColumnGeometry();
});

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
	vi.useRealTimers();
});

describe('PollCalendar: drawing slots', () => {
	it('creates a 2 hour slot on the quarter hour a click lands in', async () => {
		const { wrapper, slots } = await mountCalendar();
		await clickColumn(wrapper, TOMORROW, '10:07');
		expect(slots.value).toEqual([
			expect.objectContaining({
				startDate: TOMORROW,
				endDate: TOMORROW,
				startTime: '10:00',
				endTime: '12:00',
			}),
		]);
	});

	it('creates the range a drag covers, snapped to 15 minutes', async () => {
		const { wrapper, slots } = await mountCalendar();
		await dragColumn(wrapper, TOMORROW, '09:00', '11:32');
		expect(slots.value).toEqual([
			expect.objectContaining({ startTime: '09:00', endTime: '11:30' }),
		]);
	});

	it('draws upwards as well', async () => {
		const { wrapper, slots } = await mountCalendar();
		await dragColumn(wrapper, TOMORROW, '14:00', '12:15');
		expect(slots.value).toEqual([
			expect.objectContaining({ startTime: '12:15', endTime: '14:00' }),
		]);
	});

	it('shows the draft while drawing, and Escape drops it', async () => {
		const { wrapper, slots } = await mountCalendar();
		const element = column(wrapper, TOMORROW);
		pressColumn(element, '09:00');
		movePointer(element, '10:00');
		await nextTick();
		expect(wrapper.text()).toContain('09:00 – 10:00');

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		releasePointer(element, '10:00');
		await nextTick();
		expect(slots.value).toEqual([]);
		expect(wrapper.text()).not.toContain('09:00 – 10:00');
	});

	it('removes a slot when it is clicked', async () => {
		const { slots } = await mountCalendar([
			timed('a', TOMORROW, '09:00', '10:00'),
		]);
		await blocks()[0]!.trigger('click');
		expect(slots.value).toEqual([]);
	});
});

describe('PollCalendar: the past', () => {
	it('draws nothing on a past day', async () => {
		const { wrapper, slots } = await mountCalendar();
		await clickColumn(wrapper, YESTERDAY, '15:00');
		await dragColumn(wrapper, YESTERDAY, '15:00', '17:00');
		expect(slots.value).toEqual([]);
	});

	it('draws nothing earlier today, but does later today', async () => {
		const { wrapper, slots } = await mountCalendar();
		await clickColumn(wrapper, TODAY, '08:00');
		expect(slots.value).toEqual([]);

		await clickColumn(wrapper, TODAY, '10:00');
		expect(slots.value).toEqual([
			expect.objectContaining({ startTime: '10:00', endTime: '12:00' }),
		]);
	});

	it('stops a drag drawn upwards at the current time', async () => {
		const { wrapper, slots } = await mountCalendar();
		await dragColumn(wrapper, TODAY, '12:00', '06:00');
		expect(slots.value).toEqual([
			expect.objectContaining({ startTime: '10:00', endTime: '12:00' }),
		]);
	});

	it('shades the part of today already gone', async () => {
		const { wrapper } = await mountCalendar();
		const zone = wrapper.find<HTMLElement>(
			`[data-date="${TODAY}"] [data-past-zone]`,
		);
		expect(zone.exists()).toBe(true);
		expect(zone.element.style.height).toBe(`${10 * 64}px`);
		expect(
			wrapper.find(`[data-date="${TOMORROW}"] [data-past-zone]`).exists(),
		).toBe(false);
	});

	it('flags a slot that has already started', async () => {
		await mountCalendar([
			timed('past', TODAY, '09:00', '11:00'),
			timed('next', TOMORROW, '09:00', '11:00'),
		]);
		const [past, next] = blocks();
		expect(past!.attributes('data-past')).toBeDefined();
		expect(past!.attributes('aria-label')).toContain('déjà passé');
		expect(next!.attributes('data-past')).toBeUndefined();
	});
});

describe('PollCalendar: overlapping slots', () => {
	it('lays overlapping slots side by side instead of merging them', async () => {
		await mountCalendar([
			timed('a', TOMORROW, '09:00', '11:00'),
			timed('b', TOMORROW, '10:00', '12:00'),
		]);
		const styles = blocks().map(
			(block) => (block.element as HTMLElement).style,
		);
		expect(styles).toHaveLength(2);
		expect(styles.map((style) => style.width)).toEqual([
			'calc(50% - 4px)',
			'calc(50% - 4px)',
		]);
		expect(styles.map((style) => style.insetInlineStart)).toEqual([
			'calc(0% + 2px)',
			'calc(50% + 2px)',
		]);
	});

	it('keeps both when a new slot is drawn over another', async () => {
		const { wrapper, slots } = await mountCalendar([
			timed('a', TOMORROW, '10:00', '12:00'),
		]);
		await clickColumn(wrapper, TOMORROW, '08:30');
		expect(slots.value).toHaveLength(2);
		expect(blocks()).toHaveLength(2);
	});
});

const mountVoteCalendar = async (
	initial: CalendarTimeSlot[],
	options: {
		voters?: Record<string, SlotVoter[]>;
		best?: string[];
		readonly?: boolean;
		focused?: string | null;
	} = {},
) => {
	const votes = ref<Record<string, VoteStatus>>({});
	const vote: CalendarVoteState = {
		votes,
		voters: ref(options.voters ?? {}),
		bestSlotIds: ref(options.best ?? []),
		readonly: ref(options.readonly ?? false),
		focusedParticipantId: ref(options.focused ?? null),
		cycleVote: (id) => {
			const { [id]: current, ...rest } = votes.value;
			votes.value =
				current === undefined
					? { ...rest, [id]: 'yes' }
					: current === 'yes'
						? { ...rest, [id]: 'maybe' }
						: rest;
		},
	};
	const Harness = defineComponent({
		setup: () => () =>
			h(UApp, null, {
				default: () =>
					h(CalendarRoot, {
						modelValue: initial,
						hourStart: 0,
						hourEnd: 24,
						vote,
					}),
			}),
	});
	wrapper = await mountSuspended(Harness, {
		global: { stubs: { UIcon: true, Icon: true } },
	});
	return { wrapper, votes };
};

describe('Calendar: answering a poll', () => {
	it('cycles a slot through present, maybe and back to absent', async () => {
		const { votes } = await mountVoteCalendar([
			timed('a', TOMORROW, '09:00', '11:00'),
		]);
		const block = () => blocks()[0]!;
		expect(block().attributes('data-vote')).toBe('none');
		expect(block().attributes('aria-label')).toContain(
			'absent, 0 présent, 0 peut-être, cliquer pour présent',
		);

		await block().trigger('click');
		expect(votes.value).toEqual({ a: 'yes' });
		expect(block().attributes('data-vote')).toBe('yes');

		await block().trigger('click');
		expect(votes.value).toEqual({ a: 'maybe' });
		expect(block().attributes('data-vote')).toBe('maybe');

		await block().trigger('click');
		expect(votes.value).toEqual({});
		expect(block().attributes('data-vote')).toBe('none');
	});

	it('draws nothing on the grid', async () => {
		const { wrapper } = await mountVoteCalendar([
			timed('a', TOMORROW, '09:00', '11:00'),
		]);
		await clickColumn(wrapper, TOMORROW, '14:00');
		await dragColumn(wrapper, TOMORROW, '15:00', '17:00');
		expect(blocks()).toHaveLength(1);
	});

	it('counts the answers already sent on the slot', async () => {
		await mountVoteCalendar([timed('a', TOMORROW, '09:00', '11:00')], {
			voters: {
				a: [
					{ id: 'p1', name: 'Alice', status: 'yes' },
					{ id: 'p2', name: 'Bob', status: 'yes' },
					{ id: 'p3', name: 'Chloé', status: 'maybe' },
				],
			},
		});
		const block = blocks()[0]!;
		expect(block.find('[data-vote-tally]').text()).toMatch(/2\s+1/);
		expect(block.attributes('aria-label')).toContain(
			'2 présents, 1 peut-être',
		);
	});

	it('marks the most wanted slot', async () => {
		await mountVoteCalendar(
			[
				timed('a', TOMORROW, '09:00', '11:00'),
				timed('b', TOMORROW, '14:00', '16:00'),
			],
			{ best: ['b'] },
		);
		const [a, b] = blocks();
		expect(a!.attributes('data-best')).toBeUndefined();
		expect(b!.attributes('data-best')).toBeDefined();
		expect(b!.attributes('aria-label')).toContain('le plus demandé');
		expect(a!.find('[data-best-badge]').exists()).toBe(false);
		expect(b!.find('[data-best-badge]').text()).toContain('Top');
	});

	it('jumps to the most wanted slot and pulses it', async () => {
		const NEXT_WEEK = '2026-10-14';
		const { wrapper } = await mountVoteCalendar(
			[
				timed('a', TOMORROW, '09:00', '11:00'),
				timed('b', NEXT_WEEK, '14:00', '16:00'),
			],
			{ best: ['b'] },
		);
		expect(wrapper.text()).toContain('5 octobre — 11 octobre 2026');
		expect(wrapper.find('[data-best-button]').exists()).toBe(false);

		wrapper.findComponent(CalendarRoot).vm.revealNextBest();
		await nextTick();
		await nextTick();

		expect(wrapper.text()).toContain('12 octobre — 18 octobre 2026');
		const [b] = blocks();
		expect(b!.attributes('data-highlighted')).toBeDefined();
	});

	it('steps through slots tied for the lead', async () => {
		const { wrapper } = await mountVoteCalendar(
			[
				timed('a', TOMORROW, '14:00', '16:00'),
				timed('b', TOMORROW, '09:00', '11:00'),
			],
			{ best: ['a', 'b'] },
		);
		const calendar = wrapper.findComponent(CalendarRoot);
		const highlighted = () =>
			wrapper.find('[data-highlighted]').attributes('aria-label');

		calendar.vm.revealNextBest();
		await nextTick();
		await nextTick();
		expect(calendar.vm.bestIndex).toBe(0);
		// In time order, the morning one first
		expect(highlighted()).toContain('09:00 – 11:00');

		calendar.vm.revealNextBest();
		await nextTick();
		await nextTick();
		expect(calendar.vm.bestIndex).toBe(1);
		expect(highlighted()).toContain('14:00 – 16:00');
	});

	it('shows no best slot button before anyone answers', async () => {
		const { wrapper } = await mountVoteCalendar([
			timed('a', TOMORROW, '09:00', '11:00'),
		]);
		expect(wrapper.find('[data-best-button]').exists()).toBe(false);
	});

	it('steps back the slots a focused participant left out', async () => {
		await mountVoteCalendar(
			[
				timed('a', TOMORROW, '09:00', '11:00'),
				timed('b', TOMORROW, '14:00', '16:00'),
			],
			{
				voters: { a: [{ id: 'p1', name: 'Alice', status: 'yes' }] },
				focused: 'p1',
			},
		);
		const [a, b] = blocks();
		expect(a!.attributes('data-faded')).toBeUndefined();
		expect(b!.attributes('data-faded')).toBeDefined();
		// Dimmed, yet still solid: only its content fades
		expect(b!.classes()).toContain('bg-muted');
		expect(b!.classes().some((c) => /^opacity-/.test(c))).toBe(false);
	});

	it('keeps answered slots solid, the grid never shows through', async () => {
		await mountVoteCalendar([
			timed('a', TOMORROW, '09:00', '11:00'),
			timed('b', TOMORROW, '14:00', '16:00'),
		]);
		await blocks()[0]!.trigger('click');
		await blocks()[1]!.trigger('click');
		await blocks()[1]!.trigger('click');

		const [yes, maybe] = blocks();
		expect(yes!.classes()).toContain('bg-vote-yes');
		expect(maybe!.classes()).toContain('bg-vote-maybe');
		for (const block of [yes!, maybe!])
			expect(block.classes().some((c) => /^bg-.+\/\d+$/.test(c))).toBe(
				false,
			);
	});

	it('ignores clicks once the poll is closed', async () => {
		const { votes } = await mountVoteCalendar(
			[timed('a', TOMORROW, '09:00', '11:00')],
			{ readonly: true },
		);
		await blocks()[0]!.trigger('click');
		expect(votes.value).toEqual({});
		expect(blocks()[0]!.attributes('aria-disabled')).toBe('true');
	});

	it('ignores clicks on a slot that has already started', async () => {
		const { votes } = await mountVoteCalendar([
			timed('a', TODAY, '09:00', '11:00'),
		]);
		await blocks()[0]!.trigger('click');
		expect(votes.value).toEqual({});
		expect(blocks()[0]!.attributes('aria-label')).toContain('déjà passé');
	});

	it('answers whole-day slots from the month view', async () => {
		const { votes } = await mountVoteCalendar([
			{
				id: 'd',
				startDate: TOMORROW,
				endDate: TOMORROW,
				startTime: '00:00',
				endTime: '00:00',
				allDay: true,
			},
		]);
		await pressKey('m');
		const chip = wrapper!.find('[data-calendar-slot][data-vote]');
		await chip.trigger('click');
		expect(votes.value).toEqual({ d: 'yes' });
	});
});

describe('PollCalendar: keyboard', () => {
	it('switches views with d, w and m', async () => {
		const { wrapper } = await mountCalendar();
		expect(wrapper.findAll('[data-day-column]')).toHaveLength(7);

		await pressKey('d');
		expect(wrapper.findAll('[data-day-column]')).toHaveLength(1);
		expect(wrapper.text()).toContain('vendredi 9 octobre 2026');

		await pressKey('m');
		expect(wrapper.findAll('[data-day-column]')).toHaveLength(0);
		expect(wrapper.text()).toContain('octobre 2026');

		await pressKey('w');
		expect(wrapper.findAll('[data-day-column]')).toHaveLength(7);
	});

	it('moves through periods with the arrows, never before today', async () => {
		const { wrapper } = await mountCalendar();
		expect(wrapper.text()).toContain('5 octobre — 11 octobre 2026');

		await pressKey('ArrowRight');
		expect(wrapper.text()).toContain('12 octobre — 18 octobre 2026');

		await pressKey('ArrowLeft');
		await pressKey('ArrowLeft');
		expect(wrapper.text()).toContain('5 octobre — 11 octobre 2026');
	});

	it('comes back to today with t', async () => {
		const { wrapper } = await mountCalendar();
		await pressKey('ArrowRight');
		await pressKey('ArrowRight');
		await pressKey('t');
		expect(wrapper.text()).toContain('5 octobre — 11 octobre 2026');
	});
});
