import { describe, it, expect } from 'vitest';
import type { CalendarTimeSlot } from '../../app/types/calendar';
import {
	addMonths,
	isoDate,
	monthWeekStarts,
} from '../../app/utils/calendarDates';
import {
	HOUR_HEIGHT,
	layoutAllDay,
	layoutDay,
} from '../../app/utils/calendarLayout';
import { calendarSlotToApiSlot } from '../../app/utils/calendarSlot';

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

const allDay = (
	id: string,
	startDate: string,
	endDate: string,
): CalendarTimeSlot => ({
	id,
	startDate,
	endDate,
	startTime: '00:00',
	endTime: '00:00',
	allDay: true,
});

describe('layoutDay', () => {
	const bounds = { hourStart: 0, hourEnd: 24 };

	it('positions a slot from the top of the visible hours', () => {
		const [positioned] = layoutDay(
			[timed('a', '2026-10-12', '09:00', '10:30')],
			'2026-10-12',
			{ hourStart: 8, hourEnd: 20 },
		);
		expect(positioned).toMatchObject({
			top: HOUR_HEIGHT,
			height: 1.5 * HOUR_HEIGHT,
			left: 0,
			width: 100,
		});
	});

	it('splits overlapping slots into columns', () => {
		const result = layoutDay(
			[
				timed('a', '2026-10-12', '09:00', '11:00'),
				timed('b', '2026-10-12', '10:00', '12:00'),
				timed('c', '2026-10-12', '13:00', '14:00'),
			],
			'2026-10-12',
			bounds,
		);
		const byId = Object.fromEntries(result.map((p) => [p.slot.id, p]));
		expect(byId.a).toMatchObject({ left: 0, width: 50 });
		expect(byId.b).toMatchObject({ left: 50, width: 50 });
		expect(byId.c).toMatchObject({ left: 0, width: 100 });
	});

	it('ignores other days and all-day slots', () => {
		const result = layoutDay(
			[
				timed('a', '2026-10-13', '09:00', '10:00'),
				allDay('b', '2026-10-11', '2026-10-14'),
			],
			'2026-10-12',
			bounds,
		);
		expect(result).toEqual([]);
	});
});

describe('layoutAllDay', () => {
	const week = Array.from(
		{ length: 7 },
		(_, i) => `2026-10-${String(12 + i).padStart(2, '0')}`,
	);

	it('clips bars to the visible days and packs them into lanes', () => {
		const result = layoutAllDay(
			[
				allDay('a', '2026-10-10', '2026-10-13'),
				allDay('b', '2026-10-13', '2026-10-15'),
				allDay('c', '2026-10-16', '2026-10-20'),
			],
			week,
		);
		const byId = Object.fromEntries(result.map((p) => [p.slot.id, p]));
		expect(byId.a).toMatchObject({ colStart: 0, colSpan: 2, lane: 0 });
		expect(byId.b).toMatchObject({ colStart: 1, colSpan: 3, lane: 1 });
		expect(byId.c).toMatchObject({ colStart: 4, colSpan: 3, lane: 0 });
	});
});

describe('calendar dates', () => {
	it('always lays a month out as 6 weeks starting on a Monday', () => {
		const weeks = monthWeekStarts(new Date(2026, 9, 9));
		expect(weeks).toHaveLength(6);
		expect(isoDate(weeks[0]!)).toBe('2026-09-28');
		expect(weeks.every((week) => week.getDay() === 1)).toBe(true);
	});

	it('clamps to the last day when adding months', () => {
		expect(isoDate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
	});
});

describe('calendarSlotToApiSlot', () => {
	it('ends an all-day slot at midnight after its last day', () => {
		const { start, end } = calendarSlotToApiSlot(
			allDay('a', '2026-10-12', '2026-10-14'),
		);
		expect(start).toBe(new Date(2026, 9, 12).toISOString());
		expect(end).toBe(new Date(2026, 9, 15).toISOString());
	});

	it('supports a timed slot ending at 24:00', () => {
		const { end } = calendarSlotToApiSlot(
			timed('a', '2026-10-12', '22:00', '24:00'),
		);
		expect(end).toBe(new Date(2026, 9, 13).toISOString());
	});
});
