import { describe, it, expect, vi } from 'vitest';

const mockDrizzle = vi.fn(() => ({ select: vi.fn() }));
vi.mock('drizzle-orm/libsql', () => ({ drizzle: mockDrizzle }));

vi.stubGlobal('useRuntimeConfig', () => ({
	turso: { databaseUrl: 'libsql://test', authToken: 'test-token' },
}));

describe('useDrizzle', () => {
	it('creates a drizzle instance with runtime config', async () => {
		const { useDrizzle } = await import('../../server/utils/drizzle');
		const db = useDrizzle();

		expect(mockDrizzle).toHaveBeenCalledWith({
			connection: { url: 'libsql://test', authToken: 'test-token' },
			schema: expect.any(Object),
		});
		expect(db).toHaveProperty('select');
	});
});
