<script setup lang="ts">
	import { useWebHaptics } from 'web-haptics/vue';
	import { renderSVG } from 'uqr';

	const props = defineProps<{ url: string }>();

	const haptic = useWebHaptics();
	const { sizeMd } = useResponsiveButtonSize();
	const qrCode = computed(() => renderSVG(props.url, { pixelSize: 6 }));
</script>

<template>
	<section class="space-y-3" aria-labelledby="admin-link-title">
		<div>
			<h2 id="admin-link-title" class="text-highlighted font-semibold">
				Ton lien admin
			</h2>
			<p class="text-muted text-sm">
				Garde-le pour toi : il donne accès à la gestion du Creno.
			</p>
		</div>

		<CopyField :value="url" label="Lien admin">
			<template #leading>
				<UIcon
					name="i-lucide-key-round"
					class="text-muted mx-1 size-4 shrink-0"
					aria-hidden="true"
				/>
			</template>
			<UPopover>
				<UButton
					icon="i-lucide-qr-code"
					aria-label="QR code du lien admin"
					color="neutral"
					variant="ghost"
					:size="sizeMd"
					class="text-muted hover:bg-accented"
					@click="haptic.trigger('light')"
				>
					<span class="hidden sm:inline">QR code</span>
				</UButton>

				<template #content>
					<!-- eslint-disable vue/no-v-html -->
					<div
						class="rounded-xl bg-white p-3 [&_svg]:size-40 sm:[&_svg]:size-48"
						role="img"
						aria-label="QR code du lien admin"
						v-html="qrCode"
					/>
					<!-- eslint-enable vue/no-v-html -->
				</template>
			</UPopover>
		</CopyField>
	</section>
</template>
