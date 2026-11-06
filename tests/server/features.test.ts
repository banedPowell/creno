import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FEATURES } from '../../shared/utils/features';
import { isFeatureEnabled, requireFeature } from '../../server/utils/features';

const features = { ...FEATURES };

vi.stubGlobal('useRuntimeConfig', () => ({ public: { features } }));

beforeEach(() => {
	Object.assign(features, FEATURES);
});

describe('feature flags on the server', () => {
	it('keeps every feature off by default', () => {
		for (const name of Object.keys(FEATURES) as (keyof typeof FEATURES)[])
			expect(isFeatureEnabled(name)).toBe(false);
	});

	it('hides a route behind a flag that is off', () => {
		expect(() => requireFeature('myPolls')).toThrow(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it('opens the route once the environment turns the flag on', () => {
		features.myPolls = true;

		expect(isFeatureEnabled('myPolls')).toBe(true);
		expect(() => requireFeature('myPolls')).not.toThrow();
	});
});
