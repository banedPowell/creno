export interface OwnedPoll {
	adminToken: string;
	title?: string;
	createdAt: string;
}

export const OWNED_POLLS_KEY = 'creno:polls';

// The Crenos created from this browser, the admin token being the only proof
// of ownership the server ever hands out
export const useOwnedPolls = () => {
	const polls = useLocalStorage<Record<string, OwnedPoll>>(
		OWNED_POLLS_KEY,
		{},
		{ flush: 'sync' },
	);

	const savePoll = (
		slug: string,
		entry: { adminToken: string; title?: string },
	) => {
		const existing = polls.value[slug];
		polls.value = {
			...polls.value,
			[slug]: {
				...existing,
				...entry,
				title: entry.title ?? existing?.title,
				createdAt: existing?.createdAt ?? new Date().toISOString(),
			},
		};
	};

	const getAdminToken = (slug: string): string | undefined =>
		polls.value[slug]?.adminToken;

	return { polls, savePoll, getAdminToken };
};
