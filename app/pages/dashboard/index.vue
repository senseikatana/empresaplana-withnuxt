<script setup lang="ts">
import { hasCapability, isRole } from "#shared/acl";

definePageMeta({ layout: "dashboard", capability: "dashboard:access" });

const { t, locale } = useI18n();
const localePath = useLocalePath();
const { user } = useSession();

const { data } = await useFetch<{
	role: string;
	summary: Record<string, number>;
}>("/api/dashboard/summary", { headers: useRequestHeaders(["cookie"]) });

const { data: insights } = await useDashboardInsights();

const statIcons: Record<string, string> = {
	users: "i-lucide-users",
	routes: "i-lucide-route",
	buses: "i-lucide-bus",
	drivers: "i-lucide-id-card",
	unreadNotifications: "i-lucide-bell",
	budgets: "i-lucide-file-text",
	favorites: "i-lucide-star",
	recentSearches: "i-lucide-search",
};

/** Orden fijo para que las dos gráficas compartan leyenda y colores. */
const STATUS_ORDER = ["active", "delayed", "maintenance", "inactive"] as const;
const STATUS_TOKENS = [
	"--color-coastal-teal",
	"--color-energetic-orange",
	"--color-deep-navy",
	"--color-outline",
];

const stats = computed(() =>
	Object.entries(data.value?.summary ?? {}).map(([key, value]) => ({
		key,
		value,
		label: t(`app.stats.${key}`),
		icon: statIcons[key] ?? "i-lucide-activity",
		// Métrica secundaria REAL: solo si existe el dato en la BD.
		hint: hintFor(key, value),
	})),
);

function hintFor(key: string, total: number): string | null {
	const s = insights.value?.status;
	if (key === "routes" && s?.routes) {
		return `${s.routes.active ?? 0} ${t("app.stats.activeOf", { total })}`;
	}
	if (key === "buses" && s?.buses) {
		return `${s.buses.active ?? 0} ${t("app.stats.activeOf", { total })}`;
	}
	if (key === "drivers" && s?.drivers) {
		return `${s.drivers.active ?? 0} ${t("app.stats.activeOf", { total })}`;
	}
	if (key === "users" && insights.value?.users) {
		const { verified, total: all } = insights.value.users;
		return `${verified}/${all} ${t("app.stats.verified")}`;
	}
	return null;
}

/** Reparto por estado de una entidad, en el orden fijo. */
function statusSeries(entity: "routes" | "buses") {
	const counts = insights.value?.status?.[entity];
	if (!counts) return null;
	const labels = STATUS_ORDER.map((s) => t(`app.gestion.states.${s}`));
	const values = STATUS_ORDER.map((s) => counts[s] ?? 0);
	if (!values.some((v) => v > 0)) return null;
	return { labels, values, tokens: [...STATUS_TOKENS] };
}

const routesSeries = computed(() => statusSeries("routes"));
const busesSeries = computed(() => statusSeries("buses"));
const hasCharts = computed(() =>
	Boolean(routesSeries.value || busesSeries.value),
);

const activity = computed(() => insights.value?.activity ?? []);

function formatWhen(iso: string): string {
	const date = new Date(iso);
	return Number.isNaN(date.getTime())
		? ""
		: date.toLocaleString(locale.value, {
				day: "2-digit",
				month: "short",
				hour: "2-digit",
				minute: "2-digit",
			});
}

const role = computed(() => {
	const value = data.value?.role ?? user.value?.role;
	return value && isRole(value) ? value : undefined;
});

const shortcuts = computed(() => {
	if (!role.value) return [];
	if (hasCapability(role.value, "users:manage")) {
		return [
			{
				to: "/dashboard/gestion/usuarios",
				icon: "i-lucide-users",
				label: t("app.gestion.nav.users"),
			},
			{
				to: "/dashboard/gestion/rutas",
				icon: "i-lucide-route",
				label: t("app.gestion.nav.routes"),
			},
			{
				to: "/dashboard/gestion/reportes",
				icon: "i-lucide-bar-chart-3",
				label: t("app.gestion.nav.reports"),
			},
			{
				to: "/dashboard/asistente",
				icon: "i-lucide-sparkles",
				label: t("app.panel.assistant"),
			},
		];
	}
	if (hasCapability(role.value, "fleet:view")) {
		return [
			{
				to: "/dashboard/trabajador/lineas",
				icon: "i-lucide-route",
				label: t("app.panel.lines"),
			},
			{
				to: "/dashboard/trabajador/incidencias",
				icon: "i-lucide-alert-triangle",
				label: t("app.panel.incidents"),
			},
			{
				to: "/dashboard/trabajador/reportes",
				icon: "i-lucide-clipboard-check",
				label: t("app.panel.reports"),
			},
			{
				to: "/dashboard/asistente",
				icon: "i-lucide-sparkles",
				label: t("app.panel.assistant"),
			},
		];
	}
	return [
		{
			to: "/dashboard/cliente/cuenta",
			icon: "i-lucide-user",
			label: t("app.panel.account"),
		},
		{
			to: "/dashboard/cliente/favoritas",
			icon: "i-lucide-star",
			label: t("app.panel.favorites"),
		},
		{
			to: "/dashboard/cliente/cotizaciones",
			icon: "i-lucide-file-text",
			label: t("app.panel.quotes"),
		},
		{
			to: "/dashboard/asistente",
			icon: "i-lucide-sparkles",
			label: t("app.panel.assistant"),
		},
	];
});
</script>

<template>
	<div class="flex flex-col gap-6 max-w-7xl">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-highlighted">
				{{ t("app.stats.greeting", { name: user?.name ?? user?.username ?? "" }) }}
			</h1>
			<p class="text-muted text-sm mt-1">{{ t("app.stats.subtitle") }}</p>
		</div>

		<!-- KPIs -->
		<div v-if="stats.length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
			<UCard v-for="stat in stats" :key="stat.key" class="transition-transform hover:-translate-y-0.5">
				<div class="flex items-center gap-4">
					<div class="size-11 rounded-lg bg-primary/10 text-deep-navy flex items-center justify-center shrink-0">
						<UIcon :name="stat.icon" class="text-xl" />
					</div>
					<div class="min-w-0">
						<p class="text-2xl font-bold text-highlighted">{{ stat.value }}</p>
						<p class="text-sm text-muted truncate">{{ stat.label }}</p>
						<p v-if="stat.hint" class="text-xs text-dimmed mt-0.5 truncate">
							{{ stat.hint }}
						</p>
					</div>
				</div>
			</UCard>
		</div>

		<!-- Gráficas (solo si hay datos reales) -->
		<div v-if="hasCharts" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<UCard v-if="routesSeries" class="min-w-0">
				<template #header>
					<div>
						<h2 class="font-semibold text-highlighted">
							{{ t("app.gestion.nav.routes") }} · {{ t("app.gestion.common.statusLabel") }}
						</h2>
						<p class="text-xs text-muted">{{ t("app.gestion.dashboard.subtitle") }}</p>
					</div>
				</template>
				<ClientOnly>
					<DashboardChart
						type="doughnut"
						:labels="routesSeries.labels"
						:data="routesSeries.values"
						:color-tokens="routesSeries.tokens"
						:height="260"
					/>
					<template #fallback>
						<div class="h-[260px] animate-pulse rounded-lg bg-elevated" />
					</template>
				</ClientOnly>
			</UCard>

			<UCard v-if="busesSeries" class="min-w-0">
				<template #header>
					<div>
						<h2 class="font-semibold text-highlighted">
							{{ t("app.gestion.nav.buses") }} · {{ t("app.gestion.common.statusLabel") }}
						</h2>
						<p class="text-xs text-muted">{{ t("app.gestion.dashboard.subtitle") }}</p>
					</div>
				</template>
				<ClientOnly>
					<DashboardChart
						type="bar"
						:labels="busesSeries.labels"
						:data="busesSeries.values"
						:color-tokens="busesSeries.tokens"
						:height="260"
					/>
					<template #fallback>
						<div class="h-[260px] animate-pulse rounded-lg bg-elevated" />
					</template>
				</ClientOnly>
			</UCard>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<UCard v-if="activity.length" class="min-w-0">
				<template #header>
					<h2 class="font-semibold text-highlighted">
						{{ t("app.stats.recentActivity") }}
					</h2>
				</template>
				<ul class="flex flex-col gap-3">
					<li v-for="item in activity" :key="`${item.at}-${item.action}`" class="flex gap-3">
						<span
							class="mt-1.5 size-2 shrink-0 rounded-full bg-coastal-teal"
							aria-hidden="true"
						/>
						<div class="min-w-0">
							<p class="text-sm text-highlighted leading-snug">{{ item.action }}</p>
							<p class="text-xs text-dimmed mt-0.5">
								{{ item.user }} · {{ formatWhen(item.at) }}
							</p>
						</div>
					</li>
				</ul>
			</UCard>

			<UCard :class="activity.length ? 'lg:col-span-2' : 'lg:col-span-3'">
				<template #header>
					<h2 class="font-semibold text-highlighted">{{ t("app.stats.shortcuts") }}</h2>
				</template>
				<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
					<NuxtLink
						v-for="shortcut in shortcuts"
						:key="shortcut.to"
						:to="localePath(shortcut.to)"
						class="flex items-center gap-3 rounded-lg border border-default p-3 hover:bg-elevated/50 transition-colors"
					>
						<UIcon :name="shortcut.icon" class="text-deep-navy" />
						<span class="text-sm font-medium text-highlighted">{{ shortcut.label }}</span>
					</NuxtLink>
				</div>
			</UCard>
		</div>
	</div>
</template>
