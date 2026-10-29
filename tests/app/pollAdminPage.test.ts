import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	mockNuxtImport,
	mountSuspended,
	registerEndpoint,
} from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { getHeader } from 'h3';
import { UApp } from '#components';
import AdminPage from '../../app/pages/poll/[slug]/admin.vue';
import { OWNED_POLLS_KEY } from '../../app/composables/useOwnedPolls';

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport('navigateTo', () => navigateToMock);

const NOW = new Date(2026, 9, 9, 10, 0);

const slot = (id: string, startTime: string, yesCount = 0) => ({
	id,
	pollId: 'poll-1',
	startTime,
	duration: 3600,
	voters: yesCount ? [{ id: 'p1', name: 'Alice', status: 'yes' }] : [],
	yesCount,
	maybeCount: 0,
});

const adminPoll = (overrides: object = {}) => ({
	id: 'poll-1',
	title: 'Réunion d’équipe',
	description: 'Ordre du jour',
	slug: 'abc',
	createdAt: '2026-10-09T08:00:00.000Z',
	closedAt: '2026-10-16T21:59:59.999Z',
	votePolicy: 'token',
	hideResults: false,
	hasPassword: false,
	chosenSlotId: null,
	resultsHidden: false,
	participants: [
		{
			id: 'p1',
			name: 'Alice',
			pollId: 'poll-1',
			createdAt: '2026-10-09T08:00:00.000Z',
			voteCount: 1,
		},
	],
	slots: [
		slot('s1', '2026-10-10T07:00:00.000Z'),
		slot('s2', '2026-10-10T12:00:00.000Z', 1),
	],
	...overrides,
});

let current: ReturnType<typeof adminPoll>;

registerEndpoint('/api/polls/abc/admin', (event) => {
	if (getHeader(event, 'x-creno-admin') !== 'tok') {
		event.node.res.statusCode = 403;
		return {
			statusCode: 403,
			message: 'Seul l’organisateur peut faire cela',
		};
	}
	return current;
});
registerEndpoint('/api/polls/missing/admin', (event) => {
	event.node.res.statusCode = 404;
	return { statusCode: 404, message: 'Sondage introuvable' };
});

let wrapper: VueWrapper | undefined;
let fetchSpy: ReturnType<typeof vi.fn>;
let realFetch: typeof globalThis.$fetch;
let answer: (url: string, options: { body?: unknown }) => Promise<unknown>;

const isWrite = (url: string, options?: { method?: string }) =>
	!!options?.method && options.method !== 'GET' && url.startsWith('/api/');

const writes = () =>
	fetchSpy.mock.calls.filter(([url, options]) => isWrite(url, options));

const mountPage = async (route: string) => {
	const Harness = defineComponent({
		setup: () => () => h(UApp, null, { default: () => h(AdminPage) }),
	});
	// Icons load over the network and would outlive the test that mounted them
	wrapper = await mountSuspended(Harness, {
		route,
		global: { stubs: { UIcon: true, Icon: true } },
	});
	await flushPromises();
	return wrapper;
};

const linkInput = (label: string) =>
	wrapper!.find<HTMLInputElement>(`input[aria-label="${label}"]`);

const publicUrl = () => `${window.location.origin}/poll/abc`;

const stored = () => JSON.parse(localStorage.getItem(OWNED_POLLS_KEY) ?? '{}');

const own = (slug = 'abc', adminToken = 'tok') =>
	localStorage.setItem(
		OWNED_POLLS_KEY,
		JSON.stringify({
			[slug]: { adminToken, createdAt: '2026-10-09T08:00:00.000Z' },
		}),
	);

const loaded = () =>
	vi.waitFor(() =>
		expect(wrapper!.find('[data-admin-status]').exists()).toBe(true),
	);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	localStorage.clear();
	current = adminPoll();
	navigateToMock.mockClear();
	realFetch = globalThis.$fetch;
	answer = async () => ({});
	fetchSpy = vi.fn((url: string, options?: { method?: string }) =>
		isWrite(url, options)
			? answer(url, options as { body?: unknown })
			: realFetch(url, options as never),
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
	globalThis.$fetch = realFetch;
});

describe('Creator page: sharing', () => {
	it('sums up the poll and shows its public link', async () => {
		own();
		await mountPage('/poll/abc/admin');
		await loaded();

		expect(
			wrapper!.find<HTMLInputElement>('[data-details-title]').element
				.value,
		).toBe('Réunion d’équipe');
		expect(
			wrapper!.find<HTMLTextAreaElement>(
				'textarea[aria-label="Description du Creno"]',
			).element.value,
		).toBe('Ordre du jour');
		expect(wrapper!.find('[data-status-title]').text()).toBe('Ouvert');
		expect(linkInput('Lien du Creno').element.value).toBe(publicUrl());
	});

	it('copies the public link', async () => {
		own();
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!
			.find('button[aria-label="Copier : Lien du Creno"]')
			.trigger('click');
		await flushPromises();

		expect(await navigator.clipboard.readText()).toBe(publicUrl());
		await vi.waitFor(() => expect(wrapper!.text()).toContain('Copié'));
	});
});

describe('Creator page: admin link', () => {
	it('keeps the token of an admin link and clears it from the address', async () => {
		await mountPage('/poll/abc/admin#tok');

		await vi.waitFor(() => expect(stored().abc?.adminToken).toBe('tok'));
		await vi.waitFor(() =>
			expect(useRouter().currentRoute.value.hash).toBe(''),
		);
		await loaded();
		expect(linkInput('Lien admin').element.value).toBe(
			`${publicUrl()}/admin#tok`,
		);
	});

	it('only offers sharing to another browser', async () => {
		await mountPage('/poll/abc/admin');

		expect(linkInput('Lien admin').exists()).toBe(false);
		expect(wrapper!.text()).toContain(
			'Ce Creno n’a pas été créé depuis ce navigateur',
		);
		expect(linkInput('Lien du Creno').exists()).toBe(true);
	});

	it('says when the stored token is no longer valid', async () => {
		own('abc', 'old');
		await mountPage('/poll/abc/admin');

		await vi.waitFor(() =>
			expect(wrapper!.text()).toContain(
				'Ce lien d’administration n’est plus valide',
			),
		);
	});
});

describe('Creator page: unknown poll', () => {
	it('says the poll does not exist', async () => {
		own('missing');
		await mountPage('/poll/missing/admin');

		await vi.waitFor(() =>
			expect(wrapper!.text()).toContain('Ce Creno est introuvable'),
		);
		expect(linkInput('Lien du Creno').exists()).toBe(false);
	});
});

describe('Creator page: running the poll', () => {
	beforeEach(() => own());

	it('shows every answer, even hidden from the participants', async () => {
		current = adminPoll({ hideResults: true });
		await mountPage('/poll/abc/admin');
		await loaded();

		const best = wrapper!.find('[data-calendar-slot][data-best]');
		expect(best.attributes('aria-label')).toContain('1 présent');
		expect(best.find('[data-best-badge]').text()).toContain('Top');
		expect(wrapper!.find('[data-vote-tally]').text()).toContain('1');
		await wrapper!.find('[data-best-button]').trigger('click');
		await vi.waitFor(() =>
			expect(
				wrapper!
					.find('[data-calendar-slot][data-highlighted]')
					.exists(),
			).toBe(true),
		);
		expect(wrapper!.text()).toContain('Vous voyez déjà les réponses');
	});

	it('shows an open poll in the status, next to its closing date', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		const status = wrapper!.find('[data-admin-status]');
		expect(status.text()).toContain('Statut');
		expect(status.find('[data-status-title]').text()).toBe('Ouvert');
		expect(status.text()).toContain('jusqu’au');
		expect(status.find('[data-status-pulse]').exists()).toBe(true);
		expect(status.find('[data-details-closing]').exists()).toBe(true);
		expect(status.find('[data-close]').exists()).toBe(true);
		expect(wrapper!.find('[data-chosen-slot]').exists()).toBe(false);
	});

	it('closes the votes now', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-close]').trigger('click');
		expect(wrapper!.find('[data-status-title]').text()).toBe('Fermé');
		expect(wrapper!.find('[data-status-pulse]').exists()).toBe(false);
		expect(wrapper!.find('[data-reopen]').exists()).toBe(true);
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		const [url, options] = writes()[0]!;
		expect(url).toBe('/api/polls/abc');
		expect(options.method).toBe('PATCH');
		expect(options.body).toEqual({ closedAt: 'now' });
		expect(options.headers).toEqual({ 'x-creno-admin': 'tok' });
	});

	it('takes back the closing before it is saved', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-close]').trigger('click');
		await wrapper!.find('[data-reopen]').trigger('click');

		expect(wrapper!.find('[data-status-title]').text()).toBe('Ouvert');
		expect(wrapper!.find('[data-status-pulse]').exists()).toBe(true);
	});

	it('reopens a closed poll for a week', async () => {
		current = adminPoll({ closedAt: '2026-10-09T07:00:00.000Z' });
		await mountPage('/poll/abc/admin');
		await loaded();

		const status = wrapper!.find('[data-admin-status]');
		expect(status.find('[data-status-title]').text()).toBe('Fermé');
		expect(status.text()).toContain('depuis le');
		expect(status.find('[data-status-pulse]').exists()).toBe(false);
		expect(status.find('[data-close]').exists()).toBe(false);

		await status.find('[data-reopen]').trigger('click');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		const { closedAt } = writes()[0]![1].body as { closedAt: string };
		expect(new Date(closedAt).getTime()).toBe(
			new Date(2026, 9, 16, 23, 59, 59, 999).getTime(),
		);
	});

	it('settles on a slot picked in the calendar', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		const block = wrapper!.find('[data-calendar-slot][data-best]');
		expect(block.attributes('aria-label')).toContain(
			'cliquer pour sélectionner',
		);
		await block.trigger('click');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]![1].body).toEqual({ chosenSlotId: 's2' });
	});

	it('shows the slot settled on', async () => {
		current = adminPoll({
			chosenSlotId: 's2',
			closedAt: '2026-10-09T07:00:00.000Z',
		});
		await mountPage('/poll/abc/admin');
		await loaded();

		expect(wrapper!.find('[data-chosen-slot]').text()).toContain(
			'Créneau retenu : sam. 10 oct., 14:00 – 15:00',
		);
		expect(
			wrapper!.find('[data-calendar-slot][data-chosen]').exists(),
		).toBe(true);
		expect(wrapper!.find('[data-reopen]').exists()).toBe(true);
	});

	it('takes back the slot settled on', async () => {
		current = adminPoll({
			chosenSlotId: 's2',
			closedAt: '2026-10-09T07:00:00.000Z',
		});
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-unchoose]').trigger('click');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]![1].body).toEqual({ chosenSlotId: null });
	});

	it('saves only the details that changed', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-details-title]').setValue('Point hebdo');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]![1]).toMatchObject({
			method: 'PATCH',
			body: { title: 'Point hebdo' },
		});
		// Saving stays quiet, the page itself shows the new state
		await flushPromises();
		expect(document.body.textContent).not.toContain(
			'Modifications enregistrées',
		);
	});

	it('drops every change on cancel, sending nothing', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-details-title]').setValue('Point hebdo');
		await wrapper!.find('[data-close]').trigger('click');
		await wrapper!.find('[data-admin-cancel]').trigger('click');

		expect(
			wrapper!.find<HTMLInputElement>('[data-details-title]').element
				.value,
		).toBe('Réunion d’équipe');
		expect(wrapper!.find('[data-status-title]').text()).toBe('Ouvert');
		expect(wrapper!.find('[data-admin-save]').exists()).toBe(false);
		expect(writes()).toHaveLength(0);
	});

	it('changes the advanced options', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-advanced-toggle]').trigger('click');
		await vi.waitFor(() =>
			expect(wrapper!.find('[data-option-hide-results]').exists()).toBe(
				true,
			),
		);
		const hide = wrapper!.find('[data-option-hide-results]');
		await (
			hide.element.tagName === 'BUTTON' ? hide : hide.find('button')
		).trigger('click');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]![1].body).toEqual({ hideResults: true });
	});

	it('takes the password off', async () => {
		current = adminPoll({ hasPassword: true });
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-advanced-toggle]').trigger('click');
		await vi.waitFor(() =>
			expect(wrapper!.find('[data-remove-password]').exists()).toBe(true),
		);
		await wrapper!.find('[data-remove-password]').trigger('click');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]![1].body).toEqual({ password: null });
	});

	it('shows the message the server sends back on failure', async () => {
		answer = () =>
			Promise.reject({ data: { message: 'Date de clôture invalide' } });
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-details-title]').setValue('Point hebdo');
		await wrapper!.find('[data-admin-save]').trigger('click');

		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(
				'Date de clôture invalide',
			),
		);
		expect(wrapper!.find('[data-admin-save]').exists()).toBe(true);
	});

	it('asks before removing slots that hold answers', async () => {
		answer = async (url, options) =>
			(options.body as { dryRun: boolean }).dryRun
				? { lostVotes: 1, slots: null }
				: { lostVotes: 1, slots: [] };
		await mountPage('/poll/abc/admin');
		await loaded();

		const best = wrapper!.find('[data-calendar-slot][data-best]');
		await best.find('[data-remove-slot]').trigger('click');
		await wrapper!.find('[data-admin-save]').trigger('click');
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]![1].body).toEqual({
			dryRun: true,
			slots: [
				{
					id: 's1',
					start: '2026-10-10T07:00:00.000Z',
					end: '2026-10-10T08:00:00.000Z',
				},
			],
		});
		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(
				'Des réponses vont être perdues',
			),
		);

		(document.querySelector('[data-confirm-slots]') as HTMLElement).click();
		await vi.waitFor(() => expect(writes()).toHaveLength(2));
		expect(writes()[1]![1].body).toMatchObject({ dryRun: false });
	});

	it('deletes the poll once confirmed and forgets it', async () => {
		await mountPage('/poll/abc/admin');
		await loaded();

		await wrapper!.find('[data-delete]').trigger('click');
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-confirm-delete]'),
			).not.toBeNull(),
		);
		(
			document.querySelector('[data-confirm-delete]') as HTMLElement
		).click();
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		expect(writes()[0]).toMatchObject([
			'/api/polls/abc',
			{ method: 'DELETE' },
		]);
		await vi.waitFor(() => expect(stored()).toEqual({}));
		expect(navigateToMock).toHaveBeenCalledWith('/');
	});
});
