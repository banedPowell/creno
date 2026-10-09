import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { UApp } from '#components';
import PollCalendar from '../../app/components/calendar/PollCalendar.vue';
import type { CalendarTimeSlot } from '../../app/types/calendar';
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
