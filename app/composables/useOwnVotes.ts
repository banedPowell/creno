export interface OwnVote {
	participantId: string;
	editToken: string;
}

export const OWN_VOTES_KEY = 'creno:votes';

// The answers sent from this browser, the edit token being what lets their
// author change them later
export const useOwnVotes = () => {
	const entries = useLocalStorage<Record<string, OwnVote>>(
		OWN_VOTES_KEY,
		{},
		{ flush: 'sync' },
	);

	const save = (slug: string, entry: OwnVote) => {
		entries.value = { ...entries.value, [slug]: entry };
	};

	const get = (slug: string): OwnVote | undefined => entries.value[slug];

	const forget = (slug: string) => {
		const { [slug]: _forgotten, ...rest } = entries.value;
		entries.value = rest;
	};

	return { entries, save, get, forget };
};
