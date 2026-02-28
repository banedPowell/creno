import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const pollsTable = sqliteTable('polls', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	description: text('description'),
	slug: text('slug')
		.notNull()
		.unique()
		.$defaultFn(() => nanoid(12)),
	adminToken: text('admin_token')
		.notNull()
		.unique()
		.$defaultFn(() => nanoid(32)),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	closedAt: integer('closed_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date(Date.now() + 24 * 60 * 60 * 1000)),
});

export const slotsTable = sqliteTable('slots', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => nanoid(12)),
	pollId: text('poll_id')
		.notNull()
		.references(() => pollsTable.id, { onDelete: 'cascade' }),
	startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
	duration: integer('duration').notNull(),
});

export const participantsTable = sqliteTable('participants', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	pollId: text('poll_id')
		.notNull()
		.references(() => pollsTable.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const votesTable = sqliteTable(
	'votes',
	{
		id: text('id').primaryKey(),
		participantId: text('participant_id')
			.notNull()
			.references(() => participantsTable.id, { onDelete: 'cascade' }),
		slotId: text('slot_id')
			.notNull()
			.references(() => slotsTable.id, { onDelete: 'cascade' }),
		status: text('status', { enum: ['yes', 'maybe'] })
			.notNull()
			.default('yes'),
	},
	(table) => [
		check('status_check', sql`${table.status} IN ('yes', 'maybe')`),
	],
);

export type Poll = typeof pollsTable.$inferSelect;
export type NewPoll = typeof pollsTable.$inferInsert;
export type Slot = typeof slotsTable.$inferSelect;
export type NewSlot = typeof slotsTable.$inferInsert;
export type Participant = typeof participantsTable.$inferSelect;
export type NewParticipant = typeof participantsTable.$inferInsert;
export type Vote = typeof votesTable.$inferSelect;
export type NewVote = typeof votesTable.$inferInsert;
