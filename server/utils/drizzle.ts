import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

export function useDrizzle() {
	return drizzle({
		connection: {
			url: useRuntimeConfig().tursoUrl,
			authToken: useRuntimeConfig().tursoToken,
		},
		schema,
	});
}
