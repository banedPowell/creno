<template>
	<div class="min-h-screen bg-white dark:bg-neutral-950">
		<!-- Navigation -->
		<header class="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
			<UContainer>
				<nav class="flex h-14 items-center justify-between">
					<NuxtLink
						to="/"
						class="text-primary-600 dark:text-primary-400 text-lg font-bold tracking-tight"
					>
						Doodle
					</NuxtLink>
					<UButton
						to="/create"
						size="sm"
						variant="soft"
						leading-icon="i-lucide-plus"
					>
						Nouveau sondage
					</UButton>
				</nav>
			</UContainer>
		</header>

		<NuxtRouteAnnouncer />
		<NuxtPage />
	</div>
</template>
