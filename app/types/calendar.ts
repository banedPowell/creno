export interface CalendarTimeSlot {
	id: string;
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD (= startDate for single-day)
	startTime: string; // HH:mm
	endTime: string; // HH:mm
}

export type CalendarView = 'day' | 'week';

export interface CalendarConfig {
	hourStart: number;
	hourEnd: number;
	cellDuration: number; // minutes
	dragStep: number; // minutes
	clickSlotDuration: number; // minutes
}

export interface CalendarDayInfo {
	date: Date;
	dateStr: string; // YYYY-MM-DD
	label: string; // "lun. 3 mars"
	isToday: boolean;
}

export interface CalendarTimeLabel {
	time: string; // HH:mm
	label: string;
	index: number;
}

export interface CalendarSlotPosition {
	slot: CalendarTimeSlot;
	top: number;
	height: number;
	isStart: boolean;
	isEnd: boolean;
}

export interface CalendarDragState {
	isDragging: boolean;
	mode: 'create' | 'resize';
	resizeEdge: 'top' | 'bottom' | null;
	resizeSlotId: string | null;
	originalStartTime: string | null;
	originalEndTime: string | null;
	startDateStr: string;
	endDateStr: string;
	startIndex: number;
	endIndex: number;
}
