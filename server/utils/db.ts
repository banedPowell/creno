import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function useDB() {
	if (!_db) {
		const sqlite = new Database('server/database/sqlite.db');
		sqlite.pragma('journal_mode = WAL');
		sqlite.pragma('foreign_keys = ON');
		_db = drizzle(sqlite, { schema });
	}
	return _db;
}
