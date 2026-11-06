export interface SlotTally {
	id: string;
	yesCount: number;
	maybeCount: number;
}

// The most "yes" wins, "maybe" breaks a tie, and every slot still level after
// that leads together. Nothing leads before anyone has answered
export const bestSlotIds = (slots: SlotTally[]): string[] => {
	const top = slots.reduce(
		(best, slot) =>
			slot.yesCount > best.yes ||
			(slot.yesCount === best.yes && slot.maybeCount > best.maybe)
				? { yes: slot.yesCount, maybe: slot.maybeCount }
				: best,
		{ yes: 0, maybe: 0 },
	);
	if (top.yes + top.maybe === 0) return [];
	return slots
		.filter(
			(slot) =>
				slot.yesCount === top.yes && slot.maybeCount === top.maybe,
		)
		.map((slot) => slot.id);
};
