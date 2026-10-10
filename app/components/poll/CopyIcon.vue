<script setup lang="ts">
	const props = defineProps<{
		copied: boolean;
		// Bumps on every click, so a second copy replays the shrink
		// even while `copied` is already true
		tick?: number;
	}>();

	const COPY = 'i-lucide-copy';
	const CHECK = 'i-lucide-check';
	const ANIM_DURATION = 100;
	const HALF = ANIM_DURATION / 2;

	const iconJustShrunk = ref(false);
	const displayedIcon = ref<typeof COPY | typeof CHECK>(COPY);

	let shrinkTimeout: ReturnType<typeof setTimeout> | undefined;
	let iconTimeout: ReturnType<typeof setTimeout> | undefined;

	const clearTimers = () => {
		clearTimeout(shrinkTimeout);
		clearTimeout(iconTimeout);
	};

	const play = (isCopied: boolean) => {
		clearTimers();

		// Drop the class for a frame, otherwise a click during the
		// shrink would not restart the transition
		iconJustShrunk.value = false;
		void nextTick(() => {
			iconJustShrunk.value = true;
		});

		iconTimeout = setTimeout(() => {
			displayedIcon.value = isCopied ? CHECK : COPY;
		}, HALF);

		shrinkTimeout = setTimeout(() => {
			iconJustShrunk.value = false;
		}, ANIM_DURATION);
	};

	watch([() => props.copied, () => props.tick], ([isCopied]) =>
		play(isCopied),
	);

	onUnmounted(clearTimers);
</script>

<template>
	<div class="relative flex items-center gap-1">
		<div
			class="text-primary absolute top-1/2 left-1/2 z-10 size-7 -translate-1/2 rounded-full backdrop-blur-[2px] transition-opacity duration-50 ease-out"
			:class="[iconJustShrunk ? 'opacity-100' : 'opacity-0']"
		/>

		<UIcon
			:name="displayedIcon"
			:class="[iconJustShrunk ? 'scale-97' : 'scale-100']"
			class="size-4 transition-all duration-50 ease-out"
		/>
	</div>
</template>
