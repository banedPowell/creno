import { describe, it, expect, beforeEach } from 'vitest';
import {
	OWNED_POLLS_KEY,
	useOwnedPolls,
} from '../../app/composables/useOwnedPolls';

beforeEach(() => {
	localStorage.clear();
});

// The test storage is not a real `Storage`, so VueUse syncs through an event
// the writer also receives, which holds its next write until the next tick
const stored = () => JSON.parse(localStorage.getItem(OWNED_POLLS_KEY) ?? '{}');

describe('useOwnedPolls', () => {
	it('saves a poll and reads its token back', () => {
		const { savePoll, getAdminToken } = useOwnedPolls();

		savePoll('abc', { adminToken: 'tok', title: 'Réunion' });

		expect(getAdminToken('abc')).toBe('tok');
		expect(stored().abc).toMatchObject({
			adminToken: 'tok',
			title: 'Réunion',
		});
	});

	it('knows nothing of a poll created elsewhere', () => {
		const { getAdminToken } = useOwnedPolls();
		expect(getAdminToken('inconnu')).toBeUndefined();
	});

	it('overwrites the token but keeps the title and creation date', async () => {
		const { savePoll, getAdminToken } = useOwnedPolls();

		savePoll('abc', { adminToken: 'old', title: 'Réunion' });
		const { createdAt } = stored().abc;
		await nextTick();
		savePoll('abc', { adminToken: 'new' });

		expect(getAdminToken('abc')).toBe('new');
		expect(stored().abc).toEqual({
			adminToken: 'new',
			title: 'Réunion',
			createdAt,
		});
	});

	it('keeps the other polls', async () => {
		const { savePoll, getAdminToken } = useOwnedPolls();

		savePoll('abc', { adminToken: 'tok-a' });
		await nextTick();
		savePoll('def', { adminToken: 'tok-d' });

		expect(getAdminToken('abc')).toBe('tok-a');
		expect(getAdminToken('def')).toBe('tok-d');
	});
});
