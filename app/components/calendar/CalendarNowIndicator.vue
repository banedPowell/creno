<script setup lang="ts">
	const { config } = useCalendarContext();
	const now = useNow({ interval: 60_000 });

	const minutes = computed(
		() => now.value.getHours() * 60 + now.value.getMinutes(),
	);
	const visible = computed(
		() =>
			minutes.value >= config.hourStart * 60 &&
			minutes.value <= config.hourEnd * 60,
	);
	const top = computed(
		() => (minutes.value - config.hourStart * 60) * PX_PER_MINUTE,
	);
</script>

<template>
	<div
		v-if="visible"
		class="border-error pointer-events-none absolute inset-x-0 z-10 border-t-2"
		:style="{ top: `${top}px` }"
	>
		<div class="bg-error absolute -top-[5px] -left-1 size-2 rounded-full" />
	</div>
</template>
