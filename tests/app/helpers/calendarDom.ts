import { vi } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { PX_PER_MINUTE } from '../../../app/utils/calendarLayout';

export const COLUMN_WIDTH = 100;

// happy-dom lays nothing out: every day column is given a rect as if the
// grid opened at 00:00 on top of the page, one column per 100px
export const mockColumnGeometry = () =>
	vi
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockImplementation(function (this: HTMLElement) {
			const columns = [
				...document.querySelectorAll<HTMLElement>('[data-day-column]'),
			];
			const index = columns.indexOf(this);
			if (index === -1) return new DOMRect(0, 0, 0, 0);
			return new DOMRect(
				index * COLUMN_WIDTH,
				0,
				COLUMN_WIDTH,
				24 * 60 * PX_PER_MINUTE,
			);
		});

export const yAt = (time: string) => {
	const [h, m] = time.split(':').map(Number);
	return (h! * 60 + m!) * PX_PER_MINUTE;
};

export const column = (wrapper: VueWrapper, date: string) => {
	const element = wrapper.find<HTMLElement>(
		`[data-day-column][data-date="${date}"]`,
	);
	if (!element.exists()) throw new Error(`No day column for ${date}`);
	return element.element;
};

const pointer = (type: string, x: number, y: number) =>
	new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		pointerId: 1,
		pointerType: 'mouse',
		isPrimary: true,
		button: 0,
		buttons: type === 'pointerup' ? 0 : 1,
		clientX: x,
		clientY: y,
	});

const columnX = (element: HTMLElement) =>
	element.getBoundingClientRect().left + COLUMN_WIDTH / 2;

export const pressColumn = (element: HTMLElement, time: string) =>
	element.dispatchEvent(pointer('pointerdown', columnX(element), yAt(time)));

export const movePointer = (element: HTMLElement, time: string) =>
	window.dispatchEvent(pointer('pointermove', columnX(element), yAt(time)));

export const releasePointer = (element: HTMLElement, time: string) =>
	window.dispatchEvent(pointer('pointerup', columnX(element), yAt(time)));

export const clickColumn = async (
	wrapper: VueWrapper,
	date: string,
	time: string,
) => {
	const element = column(wrapper, date);
	pressColumn(element, time);
	releasePointer(element, time);
	await nextTick();
};

export const dragColumn = async (
	wrapper: VueWrapper,
	date: string,
	from: string,
	to: string,
) => {
	const element = column(wrapper, date);
	pressColumn(element, from);
	movePointer(element, to);
	await nextTick();
	releasePointer(element, to);
	await nextTick();
};
