// Everything the creator's page knows about its visitor. An admin link carries
// the token after `#`, so it never reaches the server nor the logs
export const usePollAdmin = (slug: MaybeRefOrGetter<string>) => {
	const route = useRoute();
	const router = useRouter();
	const { origin } = useRequestURL();
	const { savePoll, getAdminToken } = useOwnedPolls();

	onMounted(() => {
		const token = decodeURIComponent(route.hash.slice(1));
		if (!token) return;
		savePoll(toValue(slug), { adminToken: token });
		router.replace({ path: route.path, query: route.query, hash: '' });
	});

	const adminToken = computed(() => getAdminToken(toValue(slug)));
	const isOwner = computed(() => Boolean(adminToken.value));

	const publicUrl = computed(() => `${origin}/poll/${toValue(slug)}`);
	const adminUrl = computed(() =>
		adminToken.value
			? `${publicUrl.value}/admin#${encodeURIComponent(adminToken.value)}`
			: undefined,
	);

	return { adminToken, isOwner, publicUrl, adminUrl };
};
