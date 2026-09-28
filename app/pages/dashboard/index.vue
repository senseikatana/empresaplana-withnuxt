<script setup lang="ts">
import { hasCapability, isRole } from "#shared/acl";

definePageMeta({ layout: "dashboard", capability: "dashboard:access" });

const { t } = useI18n();
const localePath = useLocalePath();
const { user } = useSession();

const { data } = await useFetch<{
	role: string;
	summary: Record<string, number>;
}>("/api/dashboard/summary", { headers: useRequestHeaders(["cookie"]) });

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

const stats = computed(() =>
	Object.entries(data.value?.summary ?? {}).map(([key, value]) => ({
		key,
		value,
		label: t(`app.stats.${key}`),
		icon: statIcons[key] ?? "i-lucide-activity",
	})),
);

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

		<div v-if="stats.length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
			<UCard v-for="stat in stats" :key="stat.key">
				<div class="flex items-center gap-4">
					<div class="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
						<span :class="stat.icon" class="text-xl" />
					</div>
					<div>
						<p class="text-2xl font-bold text-highlighted">{{ stat.value }}</p>
						<p class="text-sm text-muted">{{ stat.label }}</p>
					</div>
				</div>
			</UCard>
		</div>

		<UCard>
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
					<span :class="shortcut.icon" class="text-primary" />
					<span class="text-sm font-medium text-highlighted">{{ shortcut.label }}</span>
				</NuxtLink>
			</div>
		</UCard>
	</div>
</template>
