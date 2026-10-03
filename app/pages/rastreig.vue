<script setup lang="ts">
/**
 * Bus tracking /rastreig: la parada informa si l'autobús ha passat i valora
 * el viatge. Puerto desde `empresaplana-withastro/src/pages/rastreig.astro`.
 *
 * El layout público (SiteHeader/SiteFooter/CookieBanner) lo aporta
 * `layouts/default.vue`; aquí solo va el contenido, como el resto de páginas.
 */
const { t } = useI18n();
const localePath = useLocalePath();

useHead({ title: () => t("busTracking.title") });
useSeoMeta({ description: () => t("busTracking.subtitle") });

const lineId = "l68-penedes";
const lineLabel = computed(() => t("routes.lines.cards.penedes.route"));

// Topónimos: se escriben igual en los tres idiomas.
const stops = [
	{ id: "vilanova", name: "Vilanova i la Geltrú", time: "08:15" },
	{ id: "cubelles", name: "Cubelles", time: "08:32" },
	{ id: "vilafranca", name: "Vilafranca del Penedès", time: "08:55" },
];
</script>

<template>
	<div>
		<header
			class="bg-deep-navy text-on-primary py-6 px-margin-mobile md:px-margin-desktop"
		>
			<div class="max-w-2xl mx-auto">
				<NuxtLink
					:to="localePath('/')"
					class="font-body-md text-body-md text-on-primary/70 hover:text-secondary-fixed transition-colors"
				>
					← {{ t("common.brand") }}
				</NuxtLink>
				<h1 class="font-headline-lg text-headline-lg font-bold mt-2">
					{{ t("busTracking.title") }}
				</h1>
			</div>
		</header>

		<main
			class="max-w-2xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg"
		>
			<BusTrackingPanel
				:line-id="lineId"
				:line-label="lineLabel"
				:stops="stops"
			/>
		</main>
	</div>
</template>
