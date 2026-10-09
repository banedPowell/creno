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
