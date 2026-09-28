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

const stage = ref<"photo" | "svg" | "gradient">("photo");
const base = computed(() => `/img/${props.name}`);
const photoEl = ref<HTMLImageElement | null>(null);

function onError() {
	stage.value = stage.value === "photo" ? "svg" : "gradient";
}

// Un 404 de los formatos de foto puede dispararse antes de la hidratación:
// el evento nativo se pierde y el <img> quedaría roto. Lo detectamos al montar.
onMounted(() => {
	const el = photoEl.value;
	if (
		el?.complete &&
		el.naturalWidth === 0 &&
		!el.currentSrc.endsWith(".svg")
	) {
		onError();
	}
});
</script>

<template>
	<div v-if="stage === 'gradient'" class="w-full h-full bg-gradient-to-br from-primary via-surface-tint to-coastal-teal" aria-hidden="true" />
	<img
		v-else-if="stage === 'svg'"
		:src="`${base}.svg`"
		:alt="alt"
		:width="width"
		:height="height"
		:loading="loading"
		:class="imgClass"
		decoding="async"
		@error="onError"
	/>
	<picture v-else>
		<source :srcset="`${base}.avif`" type="image/avif" />
		<source :srcset="`${base}.webp`" type="image/webp" />
		<img
			ref="photoEl"
			:src="`${base}.jpg`"
			:alt="alt"
			:width="width"
			:height="height"
			:loading="loading"
			:fetchpriority="fetchpriority"
			decoding="async"
			:class="imgClass"
			@error="onError"
		/>
	</picture>
</template>
