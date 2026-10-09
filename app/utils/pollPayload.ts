import { z } from 'zod';
import type { CalendarTimeSlot } from '~/types/calendar';
import { isoDate } from '~/utils/calendarDates';
import { calendarSlotToApiSlot } from '~/utils/calendarSlot';

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const MAX_SLOTS = 100;
export const MIN_SLOT_DURATION_MINUTES = 15;

export const pollPayloadSchema = z.object({
	title: z
		.string()
		.trim()
		.min(2, 'Ajoutez un titre (2 caractères minimum)')
		.max(
			TITLE_MAX_LENGTH,
			`Le titre ne doit pas dépasser ${TITLE_MAX_LENGTH} caractères`,
		),
	description: z
		.string()
		.trim()
		.max(
			DESCRIPTION_MAX_LENGTH,
			`La description ne doit pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères`,
		)
		.optional()
		.transform((value) => value || undefined),
	closedAt: z.iso.datetime(),
	slots: z
		.array(z.object({ start: z.iso.datetime(), end: z.iso.datetime() }))
		.min(1, 'Ajoutez au moins un créneau')
		.max(MAX_SLOTS, `${MAX_SLOTS} créneaux maximum`),
});

export type PollPayload = z.output<typeof pollPayloadSchema>;

export type PollPayloadField = 'title' | 'description' | 'closedAt' | 'slots';

export interface PollPayloadIssue {
	path: PollPayloadField;
	message: string;
}

export type PollPayloadResult =
	| { success: true; data: PollPayload }
	| { success: false; issues: PollPayloadIssue[] };

export interface PollPayloadInput {
	title?: string;
	description?: string;
	// A calendar day, without time nor zone: `CalendarDate` fits
	closingDate?: { year: number; month: number; day: number };
	slots: CalendarTimeSlot[];
}

const FIELD_ORDER: PollPayloadField[] = [
	'title',
	'description',
	'closedAt',
	'slots',
];

// Votes stay open for the whole closing day
export const closingDateToDate = ({
	year,
	month,
	day,
}: NonNullable<PollPayloadInput['closingDate']>): Date =>
	new Date(year, month - 1, day, 23, 59, 59, 999);

// An all-day slot belongs to a day, it is past once that day is over; a timed
// one is past as soon as it has started
export const isSlotPast = (slot: CalendarTimeSlot, now: Date): boolean =>
	slot.allDay
		? slot.startDate < isoDate(now)
		: new Date(calendarSlotToApiSlot(slot).start) < now;

export const buildPollPayload = (
	input: PollPayloadInput,
	now: Date = new Date(),
): PollPayloadResult => {
	const issues: PollPayloadIssue[] = [];

	let closedAt = '';
	if (!input.closingDate) {
		issues.push({
			path: 'closedAt',
			message: 'Choisissez une date de clôture',
		});
	} else {
		const date = closingDateToDate(input.closingDate);
		if (date <= now)
			issues.push({
				path: 'closedAt',
				message: 'La clôture doit être dans le futur',
			});
		closedAt = date.toISOString();
	}

	const past = input.slots.filter((slot) => isSlotPast(slot, now)).length;
	if (past)
		issues.push({
			path: 'slots',
			message:
				past > 1
					? `${past} créneaux déjà passés, supprimez-les`
					: '1 créneau déjà passé, supprimez-le',
		});

	const converted = input.slots.map(calendarSlotToApiSlot);
	if (
		converted.some(
			({ start, end }) =>
				Date.parse(end) - Date.parse(start) <
				MIN_SLOT_DURATION_MINUTES * 60_000,
		)
	)
		issues.push({
			path: 'slots',
			message: `Un créneau doit durer au moins ${MIN_SLOT_DURATION_MINUTES} minutes`,
		});

	const unique = new Map(
		converted.map((slot) => [`${slot.start}|${slot.end}`, slot]),
	);
	const slots = [...unique.values()].sort(
		(a, b) => Date.parse(a.start) - Date.parse(b.start),
	);

	const parsed = pollPayloadSchema.safeParse({
		title: input.title ?? '',
		description: input.description,
		closedAt,
		slots,
	});

	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			const path = issue.path[0] as PollPayloadField;
			// The closing date problems are already worded above
			if (path === 'closedAt' && !closedAt) continue;
			issues.push({ path, message: issue.message });
		}
	}

	if (!parsed.success || issues.length) {
		issues.sort(
			(a, b) => FIELD_ORDER.indexOf(a.path) - FIELD_ORDER.indexOf(b.path),
		);
		return { success: false, issues };
	}

	return { success: true, data: parsed.data };
};
