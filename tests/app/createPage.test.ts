import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { UApp } from '#components';
import CreatePage from '../../app/pages/poll/create.vue';
import { OWNED_POLLS_KEY } from '../../app/composables/useOwnedPolls';
import { clickColumn, mockColumnGeometry } from './helpers/calendarDom';

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport('navigateTo', () => navigateToMock);

// Friday 9 October 2026, 10:00: the closing date defaults to Friday 16
const NOW = new Date(2026, 9, 9, 10, 0);
const TOMORROW = '2026-10-10';

const POLLS_URL = '/api/polls/create';

let wrapper: VueWrapper | undefined;
let fetchSpy: ReturnType<typeof vi.fn>;
let realFetch: typeof globalThis.$fetch;
let answer: () => Promise<unknown>;

const mountPage = async () => {
	const Harness = defineComponent({
		setup: () => () => h(UApp, null, { default: () => h(CreatePage) }),
	});
	// Icons load over the network and would outlive the test that mounted them
	wrapper = await mountSuspended(Harness, {
		global: { stubs: { UIcon: true, Icon: true } },
	});
	return wrapper;
};

const titleInput = () => wrapper!.find('input[aria-label="Titre du Creno"]');
const descriptionInput = () =>
	wrapper!.find('textarea[aria-label="Description du Creno"]');
const submitButton = () => wrapper!.find('button[type="submit"]');

const pollCalls = () =>
	fetchSpy.mock.calls.filter(([url]) => url === POLLS_URL);

const submit = async () => {
	await wrapper!.find('form').trigger('submit');
	await flushPromises();
	await vi.waitFor(() => expect(pollCalls()).toHaveLength(1));
};

const sentBody = () => {
	const [, options] = pollCalls().at(-1)!;
	expect(options.method).toBe('POST');
	const body = toValue(options.body);
	// What actually goes over the wire
	return JSON.parse(JSON.stringify(body));
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	mockColumnGeometry();
	// Only the poll API is answered here, the rest (icons…) goes through
	realFetch = globalThis.$fetch;
	localStorage.clear();
	navigateToMock.mockClear();
	answer = () =>
		Promise.resolve({ slug: 'abc', adminToken: 'tok', title: 'Réunion' });
	fetchSpy = vi.fn((url: string, options?: object) =>
		url === POLLS_URL ? answer() : realFetch(url, options),
	);
	vi.stubGlobal(
		'$fetch',
		Object.assign(fetchSpy, {
			raw: realFetch.raw,
			native: realFetch.native,
			create: realFetch.create,
		}),
	);
});

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
	vi.useRealTimers();
	vi.unstubAllGlobals();
	// Unstub drops $fetch when its original descriptor was not captured.
	// Nuxt's manifest timer calls it a second later.
	globalThis.$fetch = realFetch;
});

describe('Create page: guiding the user', () => {
	it('keeps the launch button disabled until the poll is valid', async () => {
		await mountPage();
		expect(submitButton().attributes('disabled')).toBeDefined();

		await titleInput().setValue('Réunion');
		expect(submitButton().attributes('disabled')).toBeDefined();

		await clickColumn(wrapper!, TOMORROW, '10:00');
		expect(submitButton().attributes('disabled')).toBeUndefined();
	});

	it('says what is missing first, then what will be sent', async () => {
		await mountPage();
		expect(wrapper!.text()).toContain(
			'Ajoutez un titre (2 caractères minimum)',
		);

		await titleInput().setValue('   R   ');
		expect(wrapper!.text()).toContain(
			'Ajoutez un titre (2 caractères minimum)',
		);

		await titleInput().setValue('Réunion');
		expect(wrapper!.text()).toContain('Ajoutez au moins un créneau');

		await clickColumn(wrapper!, TOMORROW, '10:00');
		await clickColumn(wrapper!, TOMORROW, '14:00');
		expect(wrapper!.text()).toContain('2 créneaux · clôture le 16 oct.');
	});

	it('sends nothing while the poll is invalid', async () => {
		await mountPage();
		await wrapper!.find('form').trigger('submit');
		await flushPromises();
		expect(pollCalls()).toHaveLength(0);
	});
});

describe('Create page: what is sent', () => {
	it('sends a clean payload: trimmed, sorted, closing at the end of the day', async () => {
		await mountPage();
		await titleInput().setValue('  Réunion d’équipe  ');
		await descriptionInput().setValue('   ');
		await clickColumn(wrapper!, TOMORROW, '14:00');
		await clickColumn(wrapper!, TOMORROW, '09:00');

		await submit();

		expect(sentBody()).toEqual({
			title: 'Réunion d’équipe',
			closedAt: '2026-10-16T21:59:59.999Z',
			votePolicy: 'token',
			hideResults: false,
			slots: [
				{
					start: '2026-10-10T07:00:00.000Z',
					end: '2026-10-10T09:00:00.000Z',
				},
				{
					start: '2026-10-10T12:00:00.000Z',
					end: '2026-10-10T14:00:00.000Z',
				},
			],
		});
	});

	const openAdvanced = async () => {
		await wrapper!.find('[data-advanced-toggle]').trigger('click');
		await vi.waitFor(() =>
			expect(wrapper!.find('[data-advanced-options]').exists()).toBe(
				true,
			),
		);
	};

	const pick = async (selector: string, value: string) => {
		const node = wrapper!.find(selector);
		let parent = (
			node.element as unknown as {
				__vueParentComponent?: {
					type?: { name?: string; __name?: string };
					parent?: unknown;
					emit: (event: string, value: string) => void;
				};
			}
		).__vueParentComponent;
		const target = selector.includes('custom') ? 'UInputNumber' : 'USelect';
		while (parent && (parent.type?.name || parent.type?.__name) !== target)
			parent = parent.parent as typeof parent;
		parent!.emit(
			'update:modelValue',
			selector.includes('custom') ? Number(value) : value,
		);
		await flushPromises();
	};

	it('places a one hour slot when that length is chosen, and keeps it off the payload', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await openAdvanced();
		await pick('[data-option-click]', '60');
		await clickColumn(wrapper!, TOMORROW, '10:00');
		await submit();

		const body = sentBody();
		expect(body.slots).toEqual([
			{
				start: '2026-10-10T08:00:00.000Z',
				end: '2026-10-10T09:00:00.000Z',
			},
		]);
		expect(body).not.toHaveProperty('snapMinutes');
		expect(body).not.toHaveProperty('clickSlotDuration');
	});

	it('keeps Personnalisé open when the typed length matches a preset', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await openAdvanced();
		await pick('[data-option-click]', 'custom');

		expect(wrapper!.find('[data-option-click-custom]').exists()).toBe(true);
		await pick('[data-option-click-custom]', '60');
		expect(wrapper!.find('[data-option-click-custom]').exists()).toBe(true);

		await clickColumn(wrapper!, TOMORROW, '10:00');
		await submit();
		expect(sentBody().slots[0]).toEqual({
			start: '2026-10-10T08:00:00.000Z',
			end: '2026-10-10T09:00:00.000Z',
		});
	});

	it('snaps a click to the hour when the grid precision is one hour', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await openAdvanced();
		await pick('[data-option-snap]', '60');
		await clickColumn(wrapper!, TOMORROW, '10:20');
		await submit();

		expect(sentBody().slots[0]!.start).toBe('2026-10-10T08:00:00.000Z');
	});

	it('sends the advanced options, the password only once typed', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await clickColumn(wrapper!, TOMORROW, '10:00');

		await wrapper!.find('[data-advanced-toggle]').trigger('click');
		await vi.waitFor(() =>
			expect(wrapper!.find('[data-advanced-options]').exists()).toBe(
				true,
			),
		);
		await wrapper!
			.find('[data-advanced-options] button[role="switch"]')
			.trigger('click');
		const openOption = wrapper!
			.findAll('[data-option-policy] label')
			.find((item) => item.text().includes('Réponses ouvertes'))!;
		expect(openOption.text()).toContain(
			'Tout le monde peut modifier toutes les réponses.',
		);
		await openOption.trigger('click');
		await wrapper!
			.find('[data-option-policy] button[value="open"]')
			.trigger('click');

		const password = wrapper!.find('input[aria-label="Mot de protection"]');
		await password.setValue('ab');
		expect(wrapper!.text()).toContain('au moins 4 caractères');
		expect(submitButton().attributes('disabled')).toBeDefined();

		await password.setValue('sésame');
		await submit();

		expect(sentBody()).toMatchObject({
			votePolicy: 'open',
			hideResults: true,
			password: 'sésame',
		});
	});

	it('keeps a trimmed description', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await descriptionInput().setValue('  Ordre du jour  ');
		await clickColumn(wrapper!, TOMORROW, '10:00');

		await submit();

		expect(sentBody().description).toBe('Ordre du jour');
	});

	it('sends overlapping slots as two distinct options', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await clickColumn(wrapper!, TOMORROW, '10:00');
		await clickColumn(wrapper!, TOMORROW, '09:00');

		await submit();

		expect(sentBody().slots).toHaveLength(2);
	});
});

describe('Create page: server answer', () => {
	it('keeps the admin token and opens the creator page', async () => {
		await mountPage();
		await titleInput().setValue('Réunion');
		await clickColumn(wrapper!, TOMORROW, '10:00');

		await submit();

		await vi.waitFor(() =>
			expect(navigateToMock).toHaveBeenCalledWith('/poll/abc/admin'),
		);
		expect(
			JSON.parse(localStorage.getItem(OWNED_POLLS_KEY)!).abc,
		).toMatchObject({ adminToken: 'tok', title: 'Réunion' });
		expect(document.body.textContent).toContain('Creno lancé avec succès');
	});

	it('shows the message the server sends back on failure', async () => {
		answer = () =>
			Promise.reject(
				Object.assign(new Error('Bad Request'), {
					statusCode: 400,
					data: {
						message: 'La date de fermeture doit être dans le futur',
					},
				}),
			);
		await mountPage();
		await titleInput().setValue('Réunion');
		await clickColumn(wrapper!, TOMORROW, '10:00');

		await submit();

		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(
				'La date de fermeture doit être dans le futur',
			),
		);
		expect(navigateToMock).not.toHaveBeenCalled();
		expect(localStorage.getItem(OWNED_POLLS_KEY)).toBe('{}');
	});
});
