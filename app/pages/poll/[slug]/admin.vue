<script setup lang="ts">
	import type { InternalApi } from 'nitropack/types';

	// A built URL matches every `/api/polls/*` route, the type has to be named
	type PublicPoll = InternalApi['/api/polls/:slug']['get'];

	const route = useRoute();
	const slug = computed(() => String(route.params.slug));

	const {
		data: poll,
		error,
		refresh,
	} = await useFetch<PublicPoll>(() => `/api/polls/${slug.value}`);

	const { publicUrl, adminUrl } = usePollAdmin(slug);

	const isNotFound = computed(() => error.value?.statusCode === 404);

	useSeoMeta({
		title: () => (poll.value ? `${poll.value.title} · Creno` : 'Creno'),
		robots: 'noindex',
	});
</script>

<template>
	<UContainer class="mt-8 max-w-3xl space-y-8 pb-28 md:mt-12">
		<UEmpty
			v-if="isNotFound"
			icon="i-lucide-calendar-x"
			title="Ce Creno est introuvable"
			description="Le lien est peut-être incomplet, ou le Creno n’existe plus."
			:actions="[
				{ label: 'Retour à l’accueil', to: '/', color: 'neutral' },
			]"
		/>

		<UEmpty
			v-else-if="error || !poll"
			icon="i-lucide-cloud-off"
			title="Impossible de charger ce Creno"
			description="Vérifie ta connexion puis réessaie."
			:actions="[
				{
					label: 'Réessayer',
					icon: 'i-lucide-rotate-cw',
					color: 'neutral',
					onClick: () => refresh(),
				},
			]"
		/>

		<template v-else>
			<PollSummary
				:title="poll.title"
				:description="poll.description"
				:slot-count="poll.slots.length"
				:closed-at="poll.closedAt"
			/>

			<PollShareCard :url="publicUrl" :title="poll.title" />

			<!-- The token lives in this browser's storage, the server can't see it -->
			<ClientOnly>
				<PollAdminLinkCard v-if="adminUrl" :url="adminUrl" />
				<p
					v-else
					class="bg-elevated text-muted w-fit rounded-xl px-3 py-1.5 text-sm"
				>
					Ce Creno n’a pas été créé depuis ce navigateur : seul le
					partage est disponible ici.
				</p>
			</ClientOnly>
		</template>
	</UContainer>
</template>
