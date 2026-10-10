import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { UApp } from '#components';
import AdminPage from '../../app/pages/poll/[slug]/admin.vue';
import { OWNED_POLLS_KEY } from '../../app/composables/useOwnedPolls';

const POLL = {
	id: 'poll-1',
	title: 'Réunion d’équipe',
	description: 'Ordre du jour',
	slug: 'abc',
	createdAt: '2026-10-09T08:00:00.000Z',
	closedAt: '2026-10-16T21:59:59.999Z',
	slots: [
		{
			id: 's1',
			pollId: 'poll-1',
			startTime: '2026-10-10T07:00:00.000Z',
			duration: 3600,
		},
		{
			id: 's2',
			pollId: 'poll-1',
			startTime: '2026-10-10T12:00:00.000Z',
			duration: 3600,
		},
	],
};

registerEndpoint('/api/polls/abc', () => POLL);
registerEndpoint('/api/polls/missing', (event) => {
	event.node.res.statusCode = 404;
	return { statusCode: 404, message: 'Sondage introuvable' };
});

let wrapper: VueWrapper | undefined;

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

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
});

describe('Creator page: sharing', () => {
	it('sums up the poll and shows its public link', async () => {
		await mountPage('/poll/abc/admin');

		expect(wrapper!.text()).toContain('Réunion d’équipe');
		expect(wrapper!.text()).toContain('Ordre du jour');
		expect(wrapper!.text()).toContain(
			'2 créneaux · clôture le vendredi 16 octobre 2026',
		);
		expect(linkInput('Lien du Creno').element.value).toBe(publicUrl());
	});

	it('copies the public link', async () => {
		await mountPage('/poll/abc/admin');

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
		expect(linkInput('Lien admin').element.value).toBe(
			`${publicUrl()}/admin#tok`,
		);
	});

	it('shows the admin link to the browser that created the poll', async () => {
		localStorage.setItem(
			OWNED_POLLS_KEY,
			JSON.stringify({
				abc: { adminToken: 'saved', createdAt: POLL.createdAt },
			}),
		);
		await mountPage('/poll/abc/admin');

		expect(linkInput('Lien admin').element.value).toBe(
			`${publicUrl()}/admin#saved`,
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
});

describe('Creator page: unknown poll', () => {
	it('says the poll does not exist', async () => {
		await mountPage('/poll/missing/admin');

		expect(wrapper!.text()).toContain('Ce Creno est introuvable');
		expect(linkInput('Lien du Creno').exists()).toBe(false);
	});
});
