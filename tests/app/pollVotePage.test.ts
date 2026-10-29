import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { getHeader } from 'h3';
import { UApp } from '#components';
import VotePage from '../../app/pages/poll/[slug]/index.vue';
import { OWN_VOTES_KEY } from '../../app/composables/useOwnVotes';
import { mockColumnGeometry } from './helpers/calendarDom';

// Friday 9 October 2026, 10:00: both slots are on Saturday 10
const NOW = new Date(2026, 9, 9, 10, 0);

type Voter = { id: string; name: string; status: 'yes' | 'maybe' };

const slot = (id: string, startTime: string, voters: Voter[] = []) => {
	const yesCount = voters.filter((v) => v.status === 'yes').length;
	return {
		id,
		pollId: 'poll-1',
		startTime,
		duration: 3600,
		voters,
		yesCount,
		maybeCount: voters.length - yesCount,
	};
};

const participant = (id: string, name: string, voteCount: number) => ({
	id,
	name,
	pollId: 'poll-1',
	createdAt: '2026-10-09T08:00:00.000Z',
	voteCount,
});

const ALICE: Voter = { id: 'p1', name: 'Alice', status: 'yes' };
const BOB_YES: Voter = { id: 'p2', name: 'Bob', status: 'yes' };
const BOB_MAYBE: Voter = { id: 'p2', name: 'Bob', status: 'maybe' };

// 09:00 and 14:00 in Paris
const S1 = '2026-10-10T07:00:00.000Z';
const S2 = '2026-10-10T12:00:00.000Z';

const poll = (overrides: object = {}) => ({
	id: 'poll-1',
	title: 'Réunion d’équipe',
	description: 'Ordre du jour',
	slug: 'abc',
	createdAt: '2026-10-09T08:00:00.000Z',
	closedAt: '2026-10-16T21:59:59.999Z',
	votePolicy: 'token',
	participants: [participant('p1', 'Alice', 1)],
	slots: [slot('s1', S1), slot('s2', S2, [ALICE])],
	...overrides,
});

// What each slug answers right now, a test changes it the way the server
// would after a vote
let results: Record<string, object>;

for (const slug of ['abc', 'closed', 'empty', 'open'])
	registerEndpoint(`/api/polls/${slug}/results`, () => results[slug]);
registerEndpoint('/api/polls/locked/results', (event) => {
	const given = getHeader(event, 'x-creno-password');
	if (given && decodeURIComponent(given) === 'sésame') return results.locked;
	event.node.res.statusCode = 401;
	return {
		statusCode: 401,
		message: given ? 'Mot de passe incorrect' : 'Mot de passe requis',
	};
});
registerEndpoint('/api/polls/missing/results', (event) => {
	event.node.res.statusCode = 404;
	return { statusCode: 404, message: 'Sondage introuvable' };
});

const VOTE_URL = '/api/polls/abc/vote';
const isWrite = (url: string) =>
	url === VOTE_URL || url.includes('/participants/');

let wrapper: VueWrapper | undefined;
let fetchSpy: ReturnType<typeof vi.fn>;
let realFetch: typeof globalThis.$fetch;
const withPassword = (options?: { headers?: unknown }) =>
	!!new Headers(options?.headers as HeadersInit).get('x-creno-password');

// Reads sent with a password wait on it, so a test can look at the page
// while it loads
let gate: Promise<unknown>;
const holdReads = () => {
	let release!: () => void;
	gate = new Promise<void>((resolve) => (release = resolve));
	return release;
};
let answer: (url: string) => Promise<unknown>;

const mountPage = async (route = '/poll/abc') => {
	const Harness = defineComponent({
		setup: () => () => h(UApp, null, { default: () => h(VotePage) }),
	});
	// Icons load over the network and would outlive the test that mounted them
	wrapper = await mountSuspended(Harness, {
		route,
		global: { stubs: { UIcon: true, Icon: true } },
	});
	await flushPromises();
	return wrapper;
};

const nameInput = () =>
	wrapper!.find<HTMLInputElement>('input[aria-label="Votre nom"]');
const submitButton = () => wrapper!.find('button[type="submit"]');
const slotBlocks = () => wrapper!.findAll('[data-calendar-slot][data-vote]');
const statuses = () => slotBlocks().map((b) => b.attributes('data-vote'));
const summary = () => wrapper!.find('[data-vote-summary]').text();
const stored = () => JSON.parse(localStorage.getItem(OWN_VOTES_KEY) ?? '{}');

const writes = () => fetchSpy.mock.calls.filter(([url]) => isWrite(url));

const submit = async () => {
	await wrapper!.find('form').trigger('submit');
	await flushPromises();
	await vi.waitFor(() => expect(writes()).toHaveLength(1));
	await flushPromises();
};

const sent = () => {
	const [url, options] = writes()[0]!;
	return {
		url,
		method: options.method,
		headers: options.headers,
		body: JSON.parse(JSON.stringify(options.body)),
	};
};

const storeOwnVote = (participantId = 'p1', editToken = 'tok-alice') =>
	localStorage.setItem(
		OWN_VOTES_KEY,
		JSON.stringify({ abc: { participantId, editToken } }),
	);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	mockColumnGeometry();
	localStorage.clear();
	sessionStorage.clear();
	results = {
		abc: poll(),
		closed: poll({ slug: 'closed', closedAt: '2026-10-08T21:59:59.999Z' }),
		empty: poll({
			slug: 'empty',
			participants: [],
			slots: [slot('s1', S1)],
		}),
		open: poll({ slug: 'open', votePolicy: 'open' }),
		locked: poll({ slug: 'locked', hasPassword: true }),
	};
	realFetch = globalThis.$fetch;
	gate = Promise.resolve();
	answer = () => Promise.resolve({ id: 'p2', editToken: 'tok-bob' });
	fetchSpy = vi.fn((url: string, options?: object) =>
		isWrite(url)
			? answer(url)
			: withPassword(options)
				? gate.then(() => realFetch(url, options))
				: realFetch(url, options),
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

describe('Vote page: loading', () => {
	it('says the poll does not exist', async () => {
		await mountPage('/poll/missing');
		expect(wrapper!.text()).toContain('Ce Creno est introuvable');
		expect(nameInput().exists()).toBe(false);
	});

	it('shows a closed poll read-only, answers included', async () => {
		await mountPage('/poll/closed');
		expect(wrapper!.text()).toContain('Ce Creno est fermé');
		expect(nameInput().exists()).toBe(false);
		expect(submitButton().exists()).toBe(false);
		expect(wrapper!.find('[data-best-button]').exists()).toBe(true);
		expect(slotBlocks()).toHaveLength(2);
		expect(wrapper!.text()).toContain('Alice');
	});

	it('opens on the slots, all absent by default', async () => {
		await mountPage();
		expect(wrapper!.text()).toContain('Réunion d’équipe');
		expect(statuses()).toEqual(['none', 'none']);
		expect(wrapper!.find('[data-editing]').exists()).toBe(false);
	});
});

describe('Vote page: protected poll', () => {
	const unlock = async (password: string) => {
		await wrapper!.find('[data-password-input]').setValue(password);
		await wrapper!.find('[data-password-prompt] form').trigger('submit');
		await flushPromises();
	};

	it('asks for the password before showing anything', async () => {
		await mountPage('/poll/locked');

		expect(wrapper!.find('[data-password-prompt]').exists()).toBe(true);
		expect(wrapper!.text()).not.toContain('Réunion d’équipe');
		expect(slotBlocks()).toHaveLength(0);
	});

	it('says when the password is wrong, then opens with the right one', async () => {
		await mountPage('/poll/locked');

		await unlock('sesame');
		await vi.waitFor(() =>
			expect(wrapper!.find('[data-password-error]').exists()).toBe(true),
		);

		await unlock('sésame');
		await vi.waitFor(() =>
			expect(wrapper!.find('[data-password-prompt]').exists()).toBe(
				false,
			),
		);
		expect(wrapper!.text()).toContain('Réunion d’équipe');
		expect(slotBlocks()).toHaveLength(2);
	});

	it('loads with a password kept from earlier, showing the page frame', async () => {
		sessionStorage.setItem('creno:password:locked', 'sésame');
		const release = holdReads();
		await mountPage('/poll/locked');

		await vi.waitFor(() =>
			expect(wrapper!.find('[data-skeleton-page]').exists()).toBe(true),
		);
		expect(wrapper!.find('[data-skeleton-participants]').exists()).toBe(
			true,
		);
		expect(wrapper!.find('[data-skeleton-calendar]').exists()).toBe(true);
		expect(wrapper!.text()).not.toContain('Impossible de charger');

		release();
		await vi.waitFor(() =>
			expect(wrapper!.text()).toContain('Réunion d’équipe'),
		);
		expect(wrapper!.find('[data-skeleton-page]').exists()).toBe(false);
	});

	it('sends nothing until a password is typed', async () => {
		await mountPage('/poll/locked');

		const button = wrapper!.find(
			'[data-password-prompt] button[type="submit"]',
		);
		expect(button.attributes('disabled')).toBeDefined();
	});
});

describe('Vote page: results', () => {
	it('marks the most wanted slot inside the calendar', async () => {
		await mountPage();
		const [s1, s2] = slotBlocks();
		expect(s1!.attributes('data-best')).toBeUndefined();
		expect(s2!.find('[data-best-badge]').exists()).toBe(true);
		expect(wrapper!.find('[data-best-button]').exists()).toBe(true);
	});

	it('lists the participants and brings one forward on click', async () => {
		await mountPage();
		const alice = wrapper!.find('button[aria-pressed]');
		expect(alice.text()).toContain('Alice');

		await alice.trigger('click');
		expect(alice.attributes('aria-pressed')).toBe('true');
		const [s1, s2] = slotBlocks();
		expect(s1!.attributes('data-faded')).toBeDefined();
		expect(s2!.attributes('data-faded')).toBeUndefined();
	});

	it('says when nobody has answered yet', async () => {
		await mountPage('/poll/empty');
		expect(wrapper!.text()).toContain('Personne n’a encore répondu');
		expect(wrapper!.find('[data-best-button]').exists()).toBe(false);
	});
});

describe('Vote page: a new answer', () => {
	it('asks for a name, then sums up the answers', async () => {
		await mountPage();
		expect(summary()).toBe('Indiquez votre nom');
		expect(submitButton().attributes('disabled')).toBeDefined();

		await nameInput().setValue('Bob');
		expect(summary()).toBe('Absent sur tous les créneaux');
		expect(submitButton().attributes('disabled')).toBeUndefined();

		await slotBlocks()[0]!.trigger('click');
		await slotBlocks()[1]!.trigger('click');
		await slotBlocks()[1]!.trigger('click');
		expect(summary()).toBe('1 présence · 1 peut-être');
	});

	it('sends a clean payload, keeps the token and comes back to the answer', async () => {
		answer = async () => {
			results.abc = poll({
				participants: [
					participant('p1', 'Alice', 1),
					participant('p2', 'Bob', 2),
				],
				slots: [
					slot('s1', S1, [BOB_YES]),
					slot('s2', S2, [ALICE, BOB_MAYBE]),
				],
			});
			return { id: 'p2', editToken: 'tok-bob' };
		};
		await mountPage();
		await nameInput().setValue('  Bob  ');
		await slotBlocks()[0]!.trigger('click');
		await slotBlocks()[1]!.trigger('click');
		await slotBlocks()[1]!.trigger('click');

		await submit();

		expect(sent()).toMatchObject({
			url: VOTE_URL,
			method: 'POST',
			body: {
				name: 'Bob',
				votes: [
					{ slotId: 's1', status: 'yes' },
					{ slotId: 's2', status: 'maybe' },
				],
			},
		});
		await vi.waitFor(() =>
			expect(stored().abc).toEqual({
				participantId: 'p2',
				editToken: 'tok-bob',
			}),
		);
		expect(document.body.textContent).not.toContain('Merci');

		await vi.waitFor(() => expect(nameInput().element.value).toBe('Bob'));
		// Back to the shared view: Bob's choices are in the tally, not the colours
		expect(statuses()).toEqual(['none', 'none']);
		expect(slotBlocks()[0]!.find('[data-vote-tally]').text()).toMatch(/1/);
		expect(nameInput().element.disabled).toBe(true);
		expect(wrapper!.find('[data-revise]').text()).toBe('Modifier');
		expect(submitButton().exists()).toBe(false);
		expect(wrapper!.find('[data-own]').text()).toContain('Bob');

		await slotBlocks()[0]!.trigger('click');
		expect(statuses()).toEqual(['none', 'none']);
	});

	it('turns read-only when the poll closed meanwhile', async () => {
		answer = () =>
			Promise.reject(
				Object.assign(new Error('Gone'), {
					statusCode: 410,
					data: { message: 'Ce sondage est fermé' },
				}),
			);
		await mountPage();
		await nameInput().setValue('Bob');

		await submit();

		await vi.waitFor(() =>
			expect(wrapper!.text()).toContain('Ce Creno est fermé'),
		);
		expect(document.body.textContent).toContain('Ce Creno vient de fermer');
		expect(nameInput().exists()).toBe(false);
	});

	it('shows the message the server sends back on failure', async () => {
		answer = () =>
			Promise.reject(
				Object.assign(new Error('Bad Request'), {
					statusCode: 400,
					data: { message: 'Créneaux invalides : s9' },
				}),
			);
		await mountPage();
		await nameInput().setValue('Bob');

		await submit();

		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(
				'Créneaux invalides : s9',
			),
		);
		expect(nameInput().exists()).toBe(true);
	});
});

describe('Vote page: changing one’s own answer', () => {
	it('opens on the answer this browser sent, without a way to start another', async () => {
		storeOwnVote();
		await mountPage();

		await vi.waitFor(() => expect(nameInput().element.value).toBe('Alice'));
		expect(statuses()).toEqual(['none', 'none']);
		expect(nameInput().element.disabled).toBe(true);
		expect(wrapper!.find('[data-revise]').text()).toBe('Modifier');
		expect(wrapper!.find('[data-cancel-revision]').exists()).toBe(false);
		expect(wrapper!.find('[data-own]').text()).toContain('Vous');
		expect(slotBlocks()[1]!.find('[data-vote-tally]').text()).toMatch(/1/);

		await wrapper!.find('[data-own]').trigger('click');
		const [missed, chosen] = slotBlocks();
		expect(missed!.attributes('data-faded')).toBeDefined();
		expect(chosen!.attributes('data-faded')).toBeUndefined();

		await slotBlocks()[0]!.trigger('click');
		expect(statuses()).toEqual(['none', 'none']);
	});

	it('restores the saved answer when the change is cancelled', async () => {
		storeOwnVote();
		await mountPage();
		await vi.waitFor(() => expect(nameInput().element.value).toBe('Alice'));

		await wrapper!.find('[data-revise]').trigger('click');
		await nameInput().setValue('Alicia');
		await slotBlocks()[0]!.trigger('click');
		expect(statuses()).toEqual(['yes', 'yes']);

		await wrapper!.find('[data-cancel-revision]').trigger('click');

		expect(nameInput().element.value).toBe('Alice');
		expect(nameInput().element.disabled).toBe(true);
		expect(statuses()).toEqual(['none', 'none']);
		expect(wrapper!.find('[data-revise]').exists()).toBe(true);
		expect(submitButton().exists()).toBe(false);
	});

	it('sends the change with the token', async () => {
		storeOwnVote();
		answer = async () => ({ id: 'p1' });
		await mountPage();
		await vi.waitFor(() => expect(nameInput().element.value).toBe('Alice'));
		await wrapper!.find('[data-revise]').trigger('click');

		await slotBlocks()[0]!.trigger('click');
		await submit();

		expect(sent()).toMatchObject({
			url: '/api/polls/abc/participants/p1',
			method: 'PUT',
			headers: { 'x-creno-token': 'tok-alice' },
			body: { name: 'Alice' },
		});
		expect(sent().body.votes).toHaveLength(2);
		expect(sent().body.votes).toEqual(
			expect.arrayContaining([
				{ slotId: 's1', status: 'yes' },
				{ slotId: 's2', status: 'yes' },
			]),
		);
	});

	it('forgets a token the server refuses and starts over', async () => {
		storeOwnVote();
		answer = () =>
			Promise.reject(
				Object.assign(new Error('Forbidden'), { statusCode: 403 }),
			);
		await mountPage();
		await vi.waitFor(() => expect(nameInput().element.value).toBe('Alice'));
		await wrapper!.find('[data-revise]').trigger('click');

		await submit();

		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(
				'Vous ne pouvez modifier que votre propre réponse',
			),
		);
		expect(stored()).toEqual({});
		expect(nameInput().element.value).toBe('');
		expect(wrapper!.find('[data-editing]').exists()).toBe(false);
	});

	it('forgets an answer that no longer exists', async () => {
		storeOwnVote('gone');
		await mountPage();
		await vi.waitFor(() => expect(stored()).toEqual({}));
		expect(wrapper!.find('[data-editing]').exists()).toBe(false);
	});

	it('offers no way to change someone else’s answer', async () => {
		await mountPage();
		await wrapper!.find('button[aria-pressed]').trigger('click');
		expect(wrapper!.find('[data-edit-participant]').exists()).toBe(false);
	});
});

describe('Vote page: open policy', () => {
	it('changes anyone’s answer from the list, without a token', async () => {
		answer = async () => ({ id: 'p1' });
		await mountPage('/poll/open');

		await wrapper!.find('button[aria-pressed]').trigger('click');
		await wrapper!.find('[data-edit-participant]').trigger('click');

		expect(nameInput().element.value).toBe('Alice');
		expect(statuses()).toEqual(['none', 'yes']);
		expect(wrapper!.find('[data-editing]').text()).toContain(
			'Vous modifiez la réponse de Alice',
		);
		expect(submitButton().text()).toBe('Valider');

		await slotBlocks()[1]!.trigger('click');
		await wrapper!.find('form').trigger('submit');
		await flushPromises();
		await vi.waitFor(() => expect(writes()).toHaveLength(1));

		const [url, options] = writes()[0]!;
		expect(url).toBe('/api/polls/open/participants/p1');
		expect(options.method).toBe('PUT');
		expect(options.headers).toEqual({});
	});

	it('goes back to a new answer on cancel', async () => {
		await mountPage('/poll/open');
		await wrapper!.find('button[aria-pressed]').trigger('click');
		await wrapper!.find('[data-edit-participant]').trigger('click');

		await wrapper!.find('[data-cancel-revision]').trigger('click');

		expect(nameInput().element.value).toBe('');
		expect(statuses()).toEqual(['none', 'none']);
		expect(wrapper!.find('[data-editing]').exists()).toBe(false);
	});
});
