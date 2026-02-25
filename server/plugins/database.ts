import { sql } from 'drizzle-orm';
import { useDB } from '../utils/db';

export default defineNitroPlugin(async () => {
	const db = useDB();

	await db.run(sql`CREATE TABLE IF NOT EXISTS polls (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT,
		slug TEXT NOT NULL UNIQUE,
		admin_token TEXT NOT NULL UNIQUE,
		slot_duration INTEGER NOT NULL DEFAULT 60,
		created_at INTEGER NOT NULL,
		closed_at INTEGER
	)`);

	await db.run(sql`CREATE TABLE IF NOT EXISTS time_slots (
		id TEXT PRIMARY KEY,
		poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
		date TEXT NOT NULL,
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL
	)`);

	await db.run(sql`CREATE TABLE IF NOT EXISTS participants (
		id TEXT PRIMARY KEY,
		poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		created_at INTEGER NOT NULL
	)`);

	await db.run(sql`CREATE TABLE IF NOT EXISTS responses (
		id TEXT PRIMARY KEY,
		participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
		time_slot_id TEXT NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
		availability TEXT NOT NULL CHECK(availability IN ('yes', 'maybe', 'no'))
	)`);

	console.log('[database] SQLite initialized');
});
