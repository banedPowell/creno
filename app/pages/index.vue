<script setup lang="ts">
	useHead({ title: 'Doodle — Planifiez vos réunions facilement' });
</script>

<template>
	<div>
		<!-- Hero section -->
		<section class="bg-gradient-to-b from-neutral-50 to-white py-20 dark:from-neutral-900 dark:to-neutral-950">
			<UContainer>
				<div class="mx-auto max-w-2xl text-center">
					<h1 class="text-4xl font-extrabold tracking-tight sm:text-5xl">
						Trouvez le
						<span class="text-primary-500">meilleur créneau</span>
						pour votre groupe
					</h1>
					<p class="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
						Créez un sondage, partagez-le et laissez chacun indiquer
						ses disponibilités. Le meilleur créneau apparaît
						automatiquement.
					</p>
					<div class="mt-8 flex justify-center gap-3">
						<UButton
							to="/create"
							size="xl"
							trailing-icon="i-lucide-arrow-right"
						>
							Créer un sondage
						</UButton>
					</div>
				</div>
			</UContainer>
		</section>

		<!-- How it works -->
		<section class="py-16">
			<UContainer>
				<h2
					class="mb-12 text-center text-2xl font-bold"
				>
					Comment ça marche ?
				</h2>
				<div class="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
					<div class="text-center">
						<div
							class="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
						>
							<UIcon
								name="i-lucide-calendar-plus"
								class="h-7 w-7"
							/>
						</div>
						<h3 class="text-lg font-semibold">
							1. Créez un sondage
						</h3>
						<p class="mt-2 text-sm text-neutral-500">
							Donnez un titre et sélectionnez les créneaux
							possibles avec notre calendrier interactif.
						</p>
					</div>
					<div class="text-center">
						<div
							class="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
						>
							<UIcon
								name="i-lucide-share-2"
								class="h-7 w-7"
							/>
						</div>
						<h3 class="text-lg font-semibold">
							2. Partagez le lien
						</h3>
						<p class="mt-2 text-sm text-neutral-500">
							Envoyez le lien aux participants par email,
							messagerie ou tout autre moyen.
						</p>
					</div>
					<div class="text-center">
						<div
							class="bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
						>
							<UIcon
								name="i-lucide-trophy"
								class="h-7 w-7"
							/>
						</div>
						<h3 class="text-lg font-semibold">
							3. Trouvez la date
						</h3>
						<p class="mt-2 text-sm text-neutral-500">
							Le meilleur créneau est automatiquement identifié
							selon les disponibilités de chacun.
						</p>
					</div>
				</div>
			</UContainer>
		</section>

		<!-- Features -->
		<section class="border-t border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900">
			<UContainer>
				<div class="mx-auto max-w-4xl">
					<h2
						class="mb-8 text-center text-2xl font-bold"
					>
						Simple, rapide, efficace
					</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						<div
							class="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
						>
							<UIcon
								name="i-lucide-mouse-pointer-click"
								class="text-primary-500 mt-0.5 h-5 w-5 shrink-0"
							/>
							<div>
								<h4 class="font-medium">
									Sélection intuitive
								</h4>
								<p class="text-sm text-neutral-500">
									Glissez-déposez sur le calendrier pour
									proposer des créneaux.
								</p>
							</div>
						</div>
						<div
							class="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
						>
							<UIcon
								name="i-lucide-clock"
								class="text-primary-500 mt-0.5 h-5 w-5 shrink-0"
							/>
							<div>
								<h4 class="font-medium">
									Durées flexibles
								</h4>
								<p class="text-sm text-neutral-500">
									30 min, 1h, 1h30, 2h ou durée
									personnalisée.
								</p>
							</div>
						</div>
						<div
							class="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
						>
							<UIcon
								name="i-lucide-users"
								class="text-primary-500 mt-0.5 h-5 w-5 shrink-0"
							/>
							<div>
								<h4 class="font-medium">
									Sans inscription
								</h4>
								<p class="text-sm text-neutral-500">
									Les participants répondent simplement en
									indiquant leur nom.
								</p>
							</div>
						</div>
						<div
							class="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
						>
							<UIcon
								name="i-lucide-shield"
								class="text-primary-500 mt-0.5 h-5 w-5 shrink-0"
							/>
							<div>
								<h4 class="font-medium">
									Lien d'administration
								</h4>
								<p class="text-sm text-neutral-500">
									Modifiez ou supprimez votre sondage
									à tout moment.
								</p>
							</div>
						</div>
					</div>
				</div>
			</UContainer>
		</section>

		<!-- Footer -->
		<footer class="border-t border-neutral-200 py-8 dark:border-neutral-800">
			<UContainer>
				<p class="text-center text-sm text-neutral-400">
					Outil de planification pour votre association.
				</p>
			</UContainer>
		</footer>
	</div>
</template>
