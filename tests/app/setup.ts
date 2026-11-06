import { vi } from 'vitest';

// Dates are built in local time, a fixed zone keeps the clock change days
// and the ISO strings the same on every machine
process.env.TZ = 'Europe/Paris';

// Node 22+ ships its own `localStorage`, which throws without a backing file
// and shadows the DOM one the color mode plugin reads
class MemoryStorage implements Storage {
	#items = new Map<string, string>();
	get length() {
		return this.#items.size;
	}
	clear() {
		this.#items.clear();
	}
	getItem(key: string) {
		return this.#items.get(key) ?? null;
	}
	key(index: number) {
		return [...this.#items.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.#items.delete(key);
	}
	setItem(key: string, value: string) {
		this.#items.set(key, String(value));
	}
}

Object.defineProperty(globalThis, 'localStorage', {
	value: new MemoryStorage(),
	configurable: true,
	writable: true,
});

// The color mode plugin reads a helper its inline head script defines,
// which never runs in tests, and its own test fallback is not picked up
if (typeof window !== 'undefined' && !('__NUXT_COLOR_MODE__' in window)) {
	Object.defineProperty(window, '__NUXT_COLOR_MODE__', {
		configurable: true,
		value: {
			preference: 'light',
			value: 'light',
			getColorScheme: () => 'light',
			addColorScheme: () => {},
			removeColorScheme: () => {},
		},
	});
}

// Nuxt loads the app manifest one second after the app is ready. That timer
// outlives the test environment, then calls $fetch after teardown removed it.
const navigatorRef = globalThis.navigator;
if (navigatorRef) {
	Object.defineProperty(navigatorRef, 'connection', {
		configurable: true,
		value: { effectiveType: 'slow-2g' },
	});
}

// Since Nuxt 4.6, useFetch calls the `$fetch` it imports from `#build/fetch`
// instead of the global one. Route it back through the global so the tests'
// stubs still see the requests.
vi.mock('#build/fetch', async (importOriginal) => {
	const original = await importOriginal<typeof import('#build/fetch')>();
	const route = new Proxy(original.$fetch, {
		apply: (_target, thisArg, args) =>
			Reflect.apply(globalThis.$fetch, thisArg, args),
		get: (target, key) => Reflect.get(globalThis.$fetch ?? target, key),
	});
	return { ...original, $fetch: route };
});
