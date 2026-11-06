import type { Ref } from 'vue';
import type { VoteStatus } from '#shared/utils/votePayload';

export type { VoteStatus };

export interface CalendarTimeSlot {
	id: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD, inclusive (= startDate for a timed slot)
	startTime: string; // HH:mm
	endTime: string; // HH:mm, may be 24:00
	allDay?: true;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarConfig {
	hourStart: number;
	hourEnd: number;
	snapMinutes: number;
	clickSlotDuration: number; // minutes
}

export interface SlotVoter {
	id: string;
	name: string;
	status: VoteStatus;
}

// What a calendar showing an existing poll needs: the visitor's own answers,
// and the ones already sent, per slot
export interface CalendarVoteState {
	votes: Readonly<Ref<Record<string, VoteStatus>>>;
	voters: Readonly<Ref<Record<string, SlotVoter[]>>>;
	bestSlotIds: Readonly<Ref<string[]>>;
	readonly: Readonly<Ref<boolean>>;
	focusedParticipantId: Readonly<Ref<string | null>>;
	cycleVote: (slotId: string) => void;
	// The slot the organiser settled on
	chosenSlotId?: Readonly<Ref<string | null>>;
	// The organiser picking that slot: a click selects instead of voting
	picking?: {
		selectedId: Readonly<Ref<string | null>>;
		select: (slotId: string) => void;
	};
}

export interface CalendarViewOptions {
	initialDate?: Date;
	// The earliest day the calendar can go back to, today when left out
	minDate?: Date;
}

export interface CalendarDay {
	date: Date;
	dateStr: string; // YYYY-MM-DD
	isToday: boolean;
	isPast: boolean;
}
