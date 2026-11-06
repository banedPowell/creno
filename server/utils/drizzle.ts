import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

export function useDrizzle() {
	const config = useRuntimeConfig();
	return drizzle({
		connection: {
			url: config.tursoUrl ?? '',
			authToken: config.tursoToken ?? '',
		},
		schema,
	});
}
