<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { hasCapability, isRole } from "#shared/acl";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const { user, ensureSession } = useSession();
const { isNotificationsSlideoverOpen, toggleNotifications } = useDashboard();

// Indicador "Sincronitzat" de la navbar: muestra cuándo se registró la última
// actividad real (tabla Activity), no un estado decorativo. El composable
// comparte la petición con el home del panel.
const { data: insights, error: insightsError } = await useDashboardInsights();

const lastSyncLabel = computed(() => {
	const iso = insights.value?.activity?.[0]?.at;
	if (!iso) return null;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleString(locale.value, {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
});

useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });

// Guard de layout: corre en SSR y cliente para cualquier página del panel.
await ensureSession();
if (!user.value || !isRole(user.value.role)) {
	await navigateTo(localePath("/dashboard/login"));
}
if (user.value && user.value.emailVerified === false) {
	await navigateTo(localePath("/dashboard/pending"));
}

// Guard por capability del meta de la página (el middleware global no se ejecuta).
const requiredCapability = route.meta.capability as
	| import("#shared/acl").Capability
	| undefined;
if (
	user.value &&
	isRole(user.value.role) &&
	requiredCapability &&
	!hasCapability(user.value.role, requiredCapability)
) {
	await navigateTo(localePath("/dashboard"));
}

const role = computed(() => {
	const value = user.value?.role;
	return value && isRole(value) ? value : undefined;
});

/** Sección del menú lateral: título en mayúsculas + sus items. */
interface NavGroup {
	label: string;
	items: NavigationMenuItem[];
}

const clientGroups: NavGroup[] = [
	{
		label: t("app.gestion.groups.main"),
		items: [
			{
				label: t("app.panel.home"),
				icon: "i-lucide-home",
				to: localePath("/dashboard"),
			},
			{
				label: t("app.panel.account"),
				icon: "i-lucide-user",
				to: localePath("/dashboard/cliente/cuenta"),
			},
			{
				label: t("app.panel.favorites"),
				icon: "i-lucide-star",
				to: localePath("/dashboard/cliente/favoritas"),
			},
			{
				label: t("app.panel.quotes"),
				icon: "i-lucide-file-text",
				to: localePath("/dashboard/cliente/cotizaciones"),
			},
		],
	},
	{
		label: t("app.gestion.groups.communication"),
		items: [
			{
				label: t("app.panel.messages"),
				icon: "i-lucide-message-circle",
				to: localePath("/dashboard/mensajes"),
			},
			{
				label: t("app.panel.assistant"),
				icon: "i-lucide-sparkles",
				to: localePath("/dashboard/asistente"),
			},
		],
	},
];

const workerGroups: NavGroup[] = [
	{
		label: t("app.gestion.groups.main"),
		items: [
			{
				label: t("app.panel.home"),
				icon: "i-lucide-layout-dashboard",
				to: localePath("/dashboard"),
			},
		],
	},
	{
		label: t("app.gestion.groups.management"),
		items: [
			{
				label: t("app.panel.lines"),
				icon: "i-lucide-route",
				to: localePath("/dashboard/trabajador/lineas"),
			},
			{
				label: t("app.panel.incidents"),
				icon: "i-lucide-alert-triangle",
				to: localePath("/dashboard/trabajador/incidencias"),
			},
			{
				label: t("app.panel.reports"),
				icon: "i-lucide-clipboard-check",
				to: localePath("/dashboard/trabajador/reportes"),
			},
		],
	},
	{
		label: t("app.gestion.groups.communication"),
		items: [
			{
				label: t("releases.nav"),
				icon: "i-lucide-history",
				to: localePath("/dashboard/novedades"),
			},
			{
				label: t("app.panel.messages"),
				icon: "i-lucide-message-circle",
				to: localePath("/dashboard/mensajes"),
			},
			{
				label: t("app.panel.assistant"),
				icon: "i-lucide-sparkles",
				to: localePath("/dashboard/asistente"),
			},
		],
	},
];

const adminGroups: NavGroup[] = [
	{
		label: t("app.gestion.groups.main"),
		items: [
			{
				label: t("app.gestion.nav.panel"),
				icon: "i-lucide-layout-dashboard",
				to: localePath("/dashboard"),
			},
			{
				label: t("app.gestion.nav.map"),
				icon: "i-lucide-map",
				to: localePath("/dashboard/gestion/mapa"),
			},
		],
	},
	{
		label: t("app.gestion.groups.management"),
		items: [
			{
				label: t("app.gestion.nav.routes"),
				icon: "i-lucide-route",
				to: localePath("/dashboard/gestion/rutas"),
			},
			{
				label: t("app.gestion.nav.buses"),
				icon: "i-lucide-bus",
				to: localePath("/dashboard/gestion/autobuses"),
			},
			{
				label: t("app.gestion.nav.stops"),
				icon: "i-lucide-map-pin",
				to: localePath("/dashboard/gestion/paradas"),
			},
			{
				label: t("app.gestion.nav.schedules"),
				icon: "i-lucide-clock",
				to: localePath("/dashboard/gestion/horarios"),
			},
			{
				label: t("app.gestion.nav.drivers"),
				icon: "i-lucide-id-card",
				to: localePath("/dashboard/gestion/conductores"),
			},
			{
				label: t("app.gestion.nav.users"),
				icon: "i-lucide-users",
				to: localePath("/dashboard/gestion/usuarios"),
			},
		],
	},
	{
		label: t("app.gestion.groups.communication"),
		items: [
			{
				label: t("app.gestion.nav.notifications"),
				icon: "i-lucide-bell",
				to: localePath("/dashboard/gestion/notificaciones"),
			},
			{
				label: t("app.gestion.nav.reports"),
				icon: "i-lucide-bar-chart-3",
				to: localePath("/dashboard/gestion/reportes"),
			},
			{
				label: t("releases.nav"),
				icon: "i-lucide-history",
				to: localePath("/dashboard/novedades"),
			},
			{
				label: t("app.panel.messages"),
				icon: "i-lucide-message-circle",
				to: localePath("/dashboard/mensajes"),
			},
			{
				label: t("app.panel.assistant"),
				icon: "i-lucide-sparkles",
				to: localePath("/dashboard/asistente"),
			},
		],
	},
];

const navGroups = computed<NavGroup[]>(() => {
	if (!role.value) return [];
	if (hasCapability(role.value, "users:manage")) return adminGroups;
	if (hasCapability(role.value, "fleet:view")) return workerGroups;
	return clientGroups;
});

/** Lista plana: la usan el buscador (Ctrl+K) y el título de la navbar. */
const navItems = computed<NavigationMenuItem[]>(() =>
	navGroups.value.flatMap((group) => group.items),
);

const footerNav: NavigationMenuItem[] = [
	{
		label: t("app.panel.backToSite"),
		icon: "i-lucide-external-link",
		to: localePath("/"),
	},
];

const searchGroups = computed(() => [
	{
		id: "pages",
		label: t("app.search.pages"),
		items: navItems.value
			.filter((item) => item.to)
			.map((item) => ({
				id: String(item.to),
				label: String(item.label),
				icon: typeof item.icon === "string" ? item.icon : undefined,
				to: item.to,
			})),
	},
]);

const pageTitle = computed(() => {
	const match = navItems.value
		.filter((item) => typeof item.to === "string")
		.sort((a, b) => (b.to as string).length - (a.to as string).length)
		.find(
			(item) =>
				route.path === item.to ||
				route.path === `${String(item.to).replace(/\/$/, "")}/` ||
				route.path.startsWith(`${String(item.to).replace(/\/$/, "")}/`),
		);
	return (match?.label as string) ?? t("app.panel.home");
});
</script>

<template>
	<UDashboardGroup unit="rem">
		<UDashboardSidebar
			id="main"
			collapsible
			resizable
			:ui="{ footer: 'border-t border-default' }"
		>
			<template #header="{ collapsed }">
				<NuxtLink
					:to="localePath('/')"
					class="flex items-center gap-2.5"
					:class="collapsed ? 'justify-center' : ''"
				>
					<span class="i-lucide-bus text-xl text-deep-navy shrink-0" />
					<span v-if="!collapsed" class="font-bold text-highlighted truncate">
						{{ t("common.brand") }}
					</span>
				</NuxtLink>
			</template>

			<template #default="{ collapsed }">
				<UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />
				<!-- Menú por secciones (Principal / Gestió / Comunicació), como el
				     prototipo: título en mayúsculas y separación entre bloques. -->
				<div class="flex flex-col gap-4">
					<div v-for="group in navGroups" :key="group.label">
						<p
							v-if="!collapsed && group.label"
							class="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-dimmed"
						>
							{{ group.label }}
						</p>
						<UNavigationMenu
							:items="group.items"
							:collapsed="collapsed"
							orientation="vertical"
							tooltip
							popover
						/>
					</div>
				</div>
			</template>

			<template #footer="{ collapsed }">
				<div class="flex flex-col gap-2">
					<UNavigationMenu :items="footerNav" :collapsed="collapsed" />
					<UserMenu :collapsed="collapsed" />
				</div>
			</template>
		</UDashboardSidebar>

		<UDashboardSearch :groups="searchGroups" />

		<UDashboardPanel id="content" :ui="{ body: 'p-4 sm:p-6 overflow-y-auto' }">
			<template #header>
				<UDashboardNavbar :title="pageTitle">
					<template #right>
						<UBadge
							v-if="lastSyncLabel"
							color="success"
							variant="subtle"
							class="hidden sm:inline-flex items-center gap-2"
							:title="t('app.stats.lastActivity')"
						>
							<span
								class="size-1.5 rounded-full bg-current animate-pulse"
								aria-hidden="true"
							/>
							{{ t("app.stats.synced") }} · {{ lastSyncLabel }}
						</UBadge>
						<UButton
							icon="i-lucide-bell"
							color="neutral"
							variant="ghost"
							:aria-label="t('app.panel.notifications')"
							@click="toggleNotifications"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<!-- `#body` explícito: en UDashboardPanel, `#header` y `#body` son el
			     FALLBACK del slot por defecto. Al pasar el contenido como slot
			     por defecto, Nuxt UI no renderizaba nunca el `#header` y la
			     navbar (título + notificaciones) no aparecía. -->
			<template #body>
				<slot />
			</template>
		</UDashboardPanel>

		<NotificationsSlideover />
	</UDashboardGroup>
</template>
