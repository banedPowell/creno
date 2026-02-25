import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../database/schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function useDB() {
	if (!_db) {
		_db = drizzle({
			connection: {
				url: process.env.TURSO_DATABASE_URL || 'file:server/database/sqlite.db',
				authToken: process.env.TURSO_AUTH_TOKEN,
			},
			schema,
		});
	}
	return _db;
}
