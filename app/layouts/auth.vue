<script setup lang="ts">
/**
 * Layout para las páginas de autenticación (login / register / pending).
 *
 * Antes caían en `layouts/default.vue`, con dos problemas:
 *  1. `min-h-screen` del layout + `min-h-screen` de la propia página →
 *     la página scrolleaba siempre y la tarjeta se salía del viewport.
 *  2. Mostraba la nav de marketing (`SiteHeader`) con el CTA "RESERVA ARA"
 *     en un formulario de acceso al panel: contexto equivocado.
 *
 * Aquí hay una barra mínima de marca + controles (idioma, tema) y el
 * centrado vive en el layout, no en la página.
 */
const { locale, t } = useI18n();
const localePath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();
const colorMode = useColorMode();

const isDark = computed({
	get: () => colorMode.value === "dark",
	set: (value: boolean) => {
		colorMode.preference = value ? "dark" : "light";
	},
});

const locales = computed(() =>
	(["ca", "es", "en"] as const).map((code) => ({
		code,
		label: t(`common.lang.${code}`),
		href: switchLocalePath(code),
	})),
);
</script>

<template>
	<div
		class="bg-surface-container font-body-md text-on-surface min-h-screen flex flex-col antialiased"
	>
		<header class="w-full border-b border-surface-variant bg-surface-container-lowest">
			<div
				class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop h-16 flex items-center justify-between gap-gutter"
			>
				<a
					class="font-headline-md text-headline-md font-bold text-deep-navy flex items-center gap-2"
					:href="localePath('/')"
				>
					<span class="material-symbols-outlined icon-filled" aria-hidden="true"
						>directions_bus</span
					>
					{{ t("common.brand") }}
				</a>

				<div class="flex items-center gap-gutter text-sm font-label-md text-on-surface-variant">
					<div class="flex gap-2 items-center">
						<a
							v-for="l in locales"
							:key="l.code"
							:class="[
								'hover:text-deep-navy transition-colors cursor-pointer',
								l.code === locale ? 'font-bold text-deep-navy' : '',
							]"
							:href="l.href"
							:hreflang="l.code"
							:aria-label="l.label"
						>
							{{ l.label }}
						</a>
					</div>

					<ClientOnly>
						<button
							class="flex items-center hover:text-deep-navy transition-colors"
							type="button"
							:aria-label="isDark ? 'Activa el mode clar' : 'Activa el mode fosc'"
							:title="isDark ? 'Light mode' : 'Dark mode'"
							@click="isDark = !isDark"
						>
							<span class="material-symbols-outlined text-[18px]">{{
								isDark ? "light_mode" : "dark_mode"
							}}</span>
						</button>
						<template #fallback>
							<span class="inline-block w-[18px] h-[18px]" aria-hidden="true" />
						</template>
					</ClientOnly>

					<a
						class="hidden sm:flex items-center gap-1 hover:text-deep-navy transition-colors"
						:href="localePath('/')"
					>
						<span class="material-symbols-outlined text-[18px]" aria-hidden="true"
							>arrow_back</span
						>
						{{ t("app.panel.backToSite") }}
					</a>
				</div>
			</div>
		</header>

		<main class="flex-1 flex items-center justify-center px-4 py-8">
			<slot />
		</main>

		<CookieBanner />
	</div>
</template>
