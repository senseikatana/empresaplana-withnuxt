import { z } from "zod";

/**
 * Traduce los mensajes de validación de Zod según el locale activo de i18n.
 * zod v4 incluye locales (ca/es/en/fr) — no hace falta mantener mensajes a mano.
 */
export default defineNuxtPlugin((nuxtApp) => {
	const i18n = nuxtApp.$i18n as { locale: { value: string } };

	const apply = () => {
		const locales = z.locales as unknown as Record<string, () => unknown>;
		const config = locales[i18n.locale.value]?.() ?? locales.en?.();
		if (config) z.config(config as Parameters<typeof z.config>[0]);
	};

	apply();
	watch(() => i18n.locale.value, apply);
});
