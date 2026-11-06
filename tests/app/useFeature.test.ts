import { afterEach, describe, expect, it } from 'vitest';
import { useFeature } from '../../app/composables/useFeature';

afterEach(() => {
	useRuntimeConfig().public.features.myPolls = false;
});

describe('useFeature', () => {
	it('is off by default', () => {
		expect(useFeature('myPolls')).toBe(false);
	});

	it('follows the runtime config', () => {
		useRuntimeConfig().public.features.myPolls = true;
		expect(useFeature('myPolls')).toBe(true);
	});
});
