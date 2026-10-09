import { describe, it, expect } from 'vitest';
import type { CalendarTimeSlot } from '../../app/types/calendar';
import { useCalendarSlots } from '../../app/composables/useCalendarSlots';
import { earliestMinutes } from '../../app/utils/calendarDates';

const input = (
	startTime: string,
	endTime: string,
	date = '2026-10-12',
): Omit<CalendarTimeSlot, 'id'> => ({
	startDate: date,
	endDate: date,
	startTime,
	endTime,
});

const setup = () => {
	const slots = ref<CalendarTimeSlot[]>([]);
	return { slots, ...useCalendarSlots(slots) };
};

describe('useCalendarSlots', () => {
	it('keeps overlapping slots as distinct options', () => {
		const { slots, addSlot } = setup();
		addSlot(input('09:00', '11:00'));
		addSlot(input('10:00', '12:00'));
		addSlot(input('09:00', '09:30'));
		expect(slots.value).toHaveLength(3);
		expect(new Set(slots.value.map((slot) => slot.id)).size).toBe(3);
	});

	it('ignores an exact duplicate', () => {
		const { slots, addSlot } = setup();
		addSlot(input('09:00', '11:00'));
		addSlot(input('09:00', '11:00'));
		expect(slots.value).toHaveLength(1);
	});

	it('tells an all-day slot apart from a timed one on the same day', () => {
		const { slots, addSlot } = setup();
		addSlot(input('00:00', '00:00'));
		addSlot({ ...input('00:00', '00:00'), allDay: true });
		expect(slots.value).toHaveLength(2);
	});

	it('updates and removes a slot by id, leaving the others alone', () => {
		const { slots, addSlot, updateSlot, removeSlot } = setup();
		addSlot(input('09:00', '10:00'));
		addSlot(input('14:00', '15:00'));
		const [first, second] = slots.value;

		updateSlot(first!.id, { startTime: '08:00' });
		expect(slots.value[0]).toMatchObject({
			id: first!.id,
			startTime: '08:00',
		});
		expect(slots.value[1]).toEqual(second);

		removeSlot(first!.id);
		expect(slots.value).toEqual([second]);
	});
});

describe('earliestMinutes', () => {
	const now = new Date(2026, 9, 9, 21, 37, 20);

	it('blocks a whole past day', () => {
		expect(earliestMinutes('2026-10-08', now, 15)).toBe(Infinity);
	});

	it('starts today at the next step after now', () => {
		expect(earliestMinutes('2026-10-09', now, 15)).toBe(21 * 60 + 45);
	});

	it('does not round an exact step up', () => {
		expect(
			earliestMinutes('2026-10-09', new Date(2026, 9, 9, 10, 30), 15),
		).toBe(10 * 60 + 30);
	});

	it('counts a started minute as gone', () => {
		expect(
			earliestMinutes('2026-10-09', new Date(2026, 9, 9, 10, 30, 1), 15),
		).toBe(10 * 60 + 45);
	});

	it('leaves a day to come fully open', () => {
		expect(earliestMinutes('2026-10-10', now, 15)).toBe(0);
	});

	it('reads the wall clock on the day the clocks go back', () => {
		expect(
			earliestMinutes('2026-10-25', new Date(2026, 9, 25, 9, 0), 15),
		).toBe(9 * 60);
	});
});
