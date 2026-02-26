import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

export function useDrizzle() {
	return drizzle({
		connection: {
			url: useRuntimeConfig().turso.databaseUrl,
			authToken: useRuntimeConfig().turso.authToken,
		},
		schema,
	});
}
