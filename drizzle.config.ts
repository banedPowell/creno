import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './server/database/schema.ts',
	out: './server/database/migrations',
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL || 'file:./server/database/sqlite.db',
		authToken: process.env.TURSO_AUTH_TOKEN,
	},
});
