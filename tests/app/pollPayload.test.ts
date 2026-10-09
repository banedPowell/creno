import { describe, it, expect } from 'vitest';
import type { CalendarTimeSlot } from '../../app/types/calendar';
import {
	MAX_SLOTS,
	buildPollPayload,
	type PollPayloadInput,
	type PollPayloadResult,
} from '../../app/utils/pollPayload';

// Friday 9 October 2026, 21:37 in Paris
const NOW = new Date(2026, 9, 9, 21, 37);

let id = 0;
const timed = (
	date: string,
	startTime: string,
	endTime: string,
): CalendarTimeSlot => ({
	id: `s${++id}`,
	startDate: date,
	endDate: date,
	startTime,
	endTime,
});

const allDay = (startDate: string, endDate = startDate): CalendarTimeSlot => ({
	id: `s${++id}`,
	startDate,
	endDate,
	startTime: '00:00',
	endTime: '00:00',
	allDay: true,
});

const valid = (
	overrides: Partial<PollPayloadInput> = {},
): PollPayloadInput => ({
	title: 'Réunion',
	description: '',
	closingDate: { year: 2026, month: 10, day: 16 },
	slots: [timed('2026-10-12', '09:00', '10:00')],
	...overrides,
});

const data = (result: PollPayloadResult) => {
	if (!result.success)
		throw new Error(
			`Expected success, got ${JSON.stringify(result.issues)}`,
		);
	return result.data;
};

const issues = (result: PollPayloadResult) =>
	result.success ? [] : result.issues;

describe('buildPollPayload: title and description', () => {
	it('trims the title and drops an empty description', () => {
		const payload = data(
			buildPollPayload(
				valid({ title: '  Réunion  ', description: '   ' }),
				NOW,
			),
		);
		expect(payload.title).toBe('Réunion');
		expect(payload.description).toBeUndefined();
		expect('description' in JSON.parse(JSON.stringify(payload))).toBe(
			false,
		);
	});

	it('keeps a trimmed description', () => {
		const payload = data(
			buildPollPayload(
				valid({ description: '\n Ordre du jour \n' }),
				NOW,
			),
		);
		expect(payload.description).toBe('Ordre du jour');
	});

	it.each([
		['missing', undefined],
		['blank', '    '],
		['too short once trimmed', ' a '],
		['too long', 'a'.repeat(121)],
	])('rejects a %s title', (_, title) => {
		expect(issues(buildPollPayload(valid({ title }), NOW))).toEqual([
			expect.objectContaining({ path: 'title' }),
		]);
	});

	it('accepts a title at the length limits', () => {
		expect(buildPollPayload(valid({ title: 'ab' }), NOW).success).toBe(
			true,
		);
		expect(
			buildPollPayload(valid({ title: 'a'.repeat(120) }), NOW).success,
		).toBe(true);
	});

	it('rejects a description over 1000 characters', () => {
		expect(
			issues(
				buildPollPayload(valid({ description: 'a'.repeat(1001) }), NOW),
			),
		).toEqual([expect.objectContaining({ path: 'description' })]);
	});
});

describe('buildPollPayload: closing date', () => {
	it('closes at the very end of the chosen day', () => {
		const { closedAt } = data(buildPollPayload(valid(), NOW));
		expect(closedAt).toBe(
			new Date(2026, 9, 16, 23, 59, 59, 999).toISOString(),
		);
		expect(closedAt).toBe('2026-10-16T21:59:59.999Z');
	});

	it('accepts closing today, later tonight', () => {
		expect(
			buildPollPayload(
				valid({ closingDate: { year: 2026, month: 10, day: 9 } }),
				NOW,
			).success,
		).toBe(true);
	});

	it('rejects a closing day already over', () => {
		expect(
			issues(
				buildPollPayload(
					valid({ closingDate: { year: 2026, month: 10, day: 8 } }),
					NOW,
				),
			),
		).toEqual([
			{ path: 'closedAt', message: 'La clôture doit être dans le futur' },
		]);
	});

	it('requires a closing date', () => {
		expect(
			issues(buildPollPayload(valid({ closingDate: undefined }), NOW)),
		).toEqual([
			{ path: 'closedAt', message: 'Choisissez une date de clôture' },
		]);
	});

	it('allows slots after the closing date', () => {
		expect(
			buildPollPayload(
				valid({ slots: [timed('2026-11-02', '09:00', '10:00')] }),
				NOW,
			).success,
		).toBe(true);
	});
});

describe('buildPollPayload: slots', () => {
	it('requires at least one slot', () => {
		expect(issues(buildPollPayload(valid({ slots: [] }), NOW))).toEqual([
			{ path: 'slots', message: 'Ajoutez au moins un créneau' },
		]);
	});

	it(`caps the number of slots at ${MAX_SLOTS}`, () => {
		const slots = (count: number) =>
			Array.from({ length: count }, (_, index) =>
				timed(
					`2026-11-${String(1 + Math.floor(index / 10)).padStart(2, '0')}`,
					`${String(8 + (index % 10)).padStart(2, '0')}:00`,
					`${String(9 + (index % 10)).padStart(2, '0')}:00`,
				),
			);
		expect(
			buildPollPayload(valid({ slots: slots(MAX_SLOTS) }), NOW).success,
		).toBe(true);
		expect(
			issues(
				buildPollPayload(valid({ slots: slots(MAX_SLOTS + 1) }), NOW),
			),
		).toEqual([expect.objectContaining({ path: 'slots' })]);
	});

	it('rejects slots that already started, and says how many', () => {
		const result = buildPollPayload(
			valid({
				slots: [
					timed('2026-10-09', '21:30', '22:30'),
					timed('2026-10-08', '09:00', '10:00'),
					timed('2026-10-12', '09:00', '10:00'),
				],
			}),
			NOW,
		);
		expect(issues(result)).toEqual([
			{ path: 'slots', message: '2 créneaux déjà passés, supprimez-les' },
		]);
	});

	it('accepts a slot starting later today', () => {
		expect(
			buildPollPayload(
				valid({ slots: [timed('2026-10-09', '21:45', '22:45')] }),
				NOW,
			).success,
		).toBe(true);
	});

	it('keeps an all-day slot for today, rejects one for yesterday', () => {
		expect(
			buildPollPayload(valid({ slots: [allDay('2026-10-09')] }), NOW)
				.success,
		).toBe(true);
		expect(
			issues(
				buildPollPayload(valid({ slots: [allDay('2026-10-08')] }), NOW),
			),
		).toEqual([
			{ path: 'slots', message: '1 créneau déjà passé, supprimez-le' },
		]);
	});

	it('rejects a slot shorter than 15 minutes', () => {
		expect(
			issues(
				buildPollPayload(
					valid({ slots: [timed('2026-10-12', '09:00', '09:10')] }),
					NOW,
				),
			),
		).toEqual([expect.objectContaining({ path: 'slots' })]);
	});

	it('drops exact duplicates and sorts by start', () => {
		const { slots } = data(
			buildPollPayload(
				valid({
					slots: [
						timed('2026-10-13', '14:00', '15:00'),
						timed('2026-10-12', '09:00', '10:00'),
						timed('2026-10-13', '14:00', '15:00'),
						timed('2026-10-12', '09:30', '11:00'),
					],
				}),
				NOW,
			),
		);
		expect(slots).toEqual([
			{
				start: '2026-10-12T07:00:00.000Z',
				end: '2026-10-12T08:00:00.000Z',
			},
			{
				start: '2026-10-12T07:30:00.000Z',
				end: '2026-10-12T09:00:00.000Z',
			},
			{
				start: '2026-10-13T12:00:00.000Z',
				end: '2026-10-13T13:00:00.000Z',
			},
		]);
	});

	it('sends a slot ending at 24:00 as midnight the next day', () => {
		const { slots } = data(
			buildPollPayload(
				valid({ slots: [timed('2026-10-12', '22:00', '24:00')] }),
				NOW,
			),
		);
		expect(slots).toEqual([
			{
				start: '2026-10-12T20:00:00.000Z',
				end: '2026-10-12T22:00:00.000Z',
			},
		]);
	});

	it('sends an all-day range from midnight to midnight after its last day', () => {
		const { slots } = data(
			buildPollPayload(
				valid({ slots: [allDay('2026-10-12', '2026-10-14')] }),
				NOW,
			),
		);
		expect(slots).toEqual([
			{
				start: '2026-10-11T22:00:00.000Z',
				end: '2026-10-14T22:00:00.000Z',
			},
		]);
	});

	it('keeps the local midnights on the day the clocks go back', () => {
		const [slot] = data(
			buildPollPayload(valid({ slots: [allDay('2026-10-25')] }), NOW),
		).slots;
		expect(slot).toEqual({
			start: '2026-10-24T22:00:00.000Z',
			end: '2026-10-25T23:00:00.000Z',
		});
		expect(
			(Date.parse(slot!.end) - Date.parse(slot!.start)) / 3_600_000,
		).toBe(25);
	});
});

describe('buildPollPayload: issues', () => {
	it('lists every problem in the order of the form', () => {
		const result = buildPollPayload(
			{ title: '', slots: [], closingDate: undefined },
			NOW,
		);
		expect(issues(result).map((issue) => issue.path)).toEqual([
			'title',
			'closedAt',
			'slots',
		]);
	});

	it('produces exactly what the API reads, nothing more', () => {
		const payload = data(
			buildPollPayload(valid({ description: 'Note' }), NOW),
		);
		expect(Object.keys(payload).sort()).toEqual([
			'closedAt',
			'description',
			'slots',
			'title',
		]);
		expect(Object.keys(payload.slots[0]!).sort()).toEqual(['end', 'start']);
	});
});
