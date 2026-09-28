<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		name: string;
		alt?: string;
		imgClass?: string;
		width?: number;
		height?: number;
		loading?: "lazy" | "eager";
		fetchpriority?: "high" | "low" | "auto";
	}>(),
	{
		alt: "",
		imgClass: "w-full h-full object-cover",
		loading: "lazy",
		fetchpriority: "auto",
	},
);

const failed = ref(false);
const base = computed(() => `/img/${props.name}`);
</script>

<template>
	<div v-if="failed" class="w-full h-full bg-gradient-to-br from-deep-navy via-surface-tint to-coastal-teal" aria-hidden="true" />
	<picture v-else>
		<source :srcset="`${base}.avif`" type="image/avif" />
		<source :srcset="`${base}.webp`" type="image/webp" />
		<img
			:src="`${base}.jpg`"
			:alt="alt"
			:width="width"
			:height="height"
			:loading="loading"
			:fetchpriority="fetchpriority"
			decoding="async"
			:class="imgClass"
			@error="failed = true"
		/>
	</picture>
</template>
