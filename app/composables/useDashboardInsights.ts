/**
 * Datos de apoyo del panel (reparto de estados, usuarios y actividad).
 *
 * Existe como composable para que `layouts/dashboard.vue` (indicador
 * "Sincronitzat") y `pages/dashboard/index.vue` (gráficas y feed) compartan
 * UNA sola petición: `useFetch` deduplica por `key`, pero exige que las
 * opciones sean idénticas — con dos llamadas distintas Nuxt lanzaba
 * `[NUXT_E3004] Incompatible options detected`.
 */

export interface DashboardActivity {
	at: string;
	action: string;
	user: string;
}

export interface DashboardInsights {
	/** Reparto por estado de rutas/autobuses/conductores (solo con fleet:view). */
	status: Record<string, Record<string, number>> | null;
	/** Totales de usuarios (solo con users:manage). */
	users: { total: number; verified: number } | null;
	activity: DashboardActivity[];
}

export function useDashboardInsights(key = "dashboard-insights") {
	return useFetch<DashboardInsights>("/api/dashboard/insights", {
		key,
		headers: useRequestHeaders(["cookie"]),
		default: () => ({ status: null, users: null, activity: [] }),
	});
}
