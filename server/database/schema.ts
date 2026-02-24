import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const polls = sqliteTable('polls', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	description: text('description'),
	slug: text('slug').notNull().unique(),
	adminToken: text('admin_token').notNull().unique(),
	slotDuration: integer('slot_duration').notNull().default(60),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	closedAt: integer('closed_at', { mode: 'timestamp' }),
});

export const timeSlots = sqliteTable('time_slots', {
	id: text('id').primaryKey(),
	pollId: text('poll_id')
		.notNull()
		.references(() => polls.id, { onDelete: 'cascade' }),
	date: text('date').notNull(),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),
});

export const participants = sqliteTable('participants', {
	id: text('id').primaryKey(),
	pollId: text('poll_id')
		.notNull()
		.references(() => polls.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const responses = sqliteTable('responses', {
	id: text('id').primaryKey(),
	participantId: text('participant_id')
		.notNull()
		.references(() => participants.id, { onDelete: 'cascade' }),
	timeSlotId: text('time_slot_id')
		.notNull()
		.references(() => timeSlots.id, { onDelete: 'cascade' }),
	availability: text('availability', {
		enum: ['yes', 'maybe', 'no'],
	}).notNull(),
});

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
export type TimeSlot = typeof timeSlots.$inferSelect;
export type NewTimeSlot = typeof timeSlots.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
