<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import { renderSVG } from 'uqr';

	const props = defineProps<{ url: string; title: string }>();

	const haptic = useWebHaptics();
	const { sizeMd } = useResponsiveButtonSize();
	const { share, isSupported: canShare } = useShare();

	// Built by uqr from the link alone, never from what a user typed
	const qrCode = computed(() => renderSVG(props.url, { pixelSize: 6 }));

	async function shareLink() {
		haptic.trigger('light');
		try {
			await share({
				title: props.title,
				text: `Indique tes disponibilités pour « ${props.title} »`,
				url: props.url,
			});
		} catch {
			// Closing the share sheet rejects too, there is nothing to report
		}
	}
</script>

<template>
	<section
		class="bg-elevated space-y-3 rounded-xl p-4"
		aria-labelledby="share-title"
	>
		<div>
			<h2 id="share-title" class="text-highlighted font-semibold">
				Ton Creno est prêt, partage-le
			</h2>
			<p class="text-muted text-sm">
				Envoie ce lien aux participants pour qu’ils indiquent leurs
				disponibilités.
			</p>
		</div>

		<CopyField :value="url" label="Lien du Creno" />

		<div class="flex flex-wrap gap-2">
			<UButton
				v-if="canShare"
				icon="i-lucide-share-2"
				label="Partager"
				color="neutral"
				variant="soft"
				:size="sizeMd"
				class="hover:bg-accented"
				@click="shareLink"
			/>

			<UPopover>
				<UButton
					icon="i-lucide-qr-code"
					label="QR code"
					color="neutral"
					variant="soft"
					:size="sizeMd"
					class="hover:bg-accented"
					@click="haptic.trigger('light')"
				/>

				<template #content>
					<!-- eslint-disable vue/no-v-html -->
					<div
						class="rounded-lg bg-white p-3 [&_svg]:size-48"
						role="img"
						aria-label="QR code du lien du Creno"
						v-html="qrCode"
					/>
					<!-- eslint-enable vue/no-v-html -->
				</template>
			</UPopover>
		</div>
	</section>
</template>
