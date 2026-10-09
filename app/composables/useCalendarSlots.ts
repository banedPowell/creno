import type { CalendarTimeSlot } from '~/types/calendar';
let slotIdCounter = 0;

const generateSlotId = (): string => `slot-${++slotIdCounter}`;

const isSameSlot = (
	a: Omit<CalendarTimeSlot, 'id'>,
	b: Omit<CalendarTimeSlot, 'id'>,
): boolean =>
	a.startDate === b.startDate &&
	a.endDate === b.endDate &&
	a.startTime === b.startTime &&
	a.endTime === b.endTime &&
	!!a.allDay === !!b.allDay;

export const useCalendarSlots = (slots: Ref<CalendarTimeSlot[]>) => {
	// Overlapping slots are distinct options and sit side by side, only an
	// exact duplicate is dropped
	const addSlot = (input: Omit<CalendarTimeSlot, 'id'>) => {
		if (slots.value.some((slot) => isSameSlot(slot, input))) return;
		slots.value = [...slots.value, { ...input, id: generateSlotId() }];
	};

	const removeSlot = (id: string) => {
		slots.value = slots.value.filter((slot) => slot.id !== id);
	};

	const updateSlot = (id: string, updates: Partial<CalendarTimeSlot>) => {
		slots.value = slots.value.map((slot) =>
			slot.id === id ? { ...slot, ...updates } : slot,
		);
	};

	return { addSlot, removeSlot, updateSlot };
};
