/**
 * Destino de los enlaces de Intranet/Dashboard.
 *
 * El build estático del portfolio no tiene API, Prisma ni sesión, así que
 * `/dashboard` devuelve 404 ahí. En ese caso apuntamos a la app real
 * (NUXT_PUBLIC_APP_URL) y dejamos que su propio guard redirija a login.
 * Si no hay URL configurada devolvemos null y el enlace se oculta: es
 * preferible a mostrar un enlace roto.
 */
export function useDashboardHref() {
	const config = useRuntimeConfig();
	const localePath = useLocalePath();

	const appUrl = String(config.public.appUrl ?? "")
		.trim()
		.replace(/\/+$/, "");

	if (import.meta.dev && config.public.staticDemo && !appUrl) {
		console.warn(
			"[empresaplana] NUXT_PUBLIC_APP_URL sin definir: el enlace de intranet se oculta en el demo estático.",
		);
	}

	return computed(() => {
		if (config.public.staticDemo) {
			return appUrl ? `${appUrl}/dashboard` : null;
		}
		return localePath("/dashboard");
	});
}
