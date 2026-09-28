<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import { hasCapability, isRole } from "#shared/acl";

defineProps<{ collapsed?: boolean }>();

const { t } = useI18n();
const localePath = useLocalePath();
const colorMode = useColorMode();
const { user, clear } = useSession();

const role = computed(() => {
	const value = user.value?.role;
	return value && isRole(value) ? value : "client";
});

const items = computed<DropdownMenuItem[][]>(() => [
	[
		{
			type: "label",
			label: user.value?.name ?? user.value?.username ?? "",
			avatar: { src: avatarSrc.value, alt: user.value?.name ?? "" },
		},
	],
	[
		{
			label: t("app.panel.account"),
			icon: "i-lucide-user",
			to: localePath("/dashboard/cliente/cuenta"),
		},
		...(user.value && hasCapability(role.value, "chat:access")
			? [
					{
						label: t("app.panel.messages"),
						icon: "i-lucide-message-circle",
						to: localePath("/dashboard/mensajes"),
					},
				]
			: []),
		{
			label: t("app.panel.backToSite"),
			icon: "i-lucide-external-link",
			to: localePath("/"),
		},
	],
	[
		{
			label: t("app.menu.appearance"),
			icon: "i-lucide-sun-moon",
			children: [
				{
					label: t("app.menu.light"),
					icon: "i-lucide-sun",
					type: "checkbox",
					checked: colorMode.value === "light",
					onSelect(e: Event) {
						e.preventDefault();
						colorMode.preference = "light";
					},
				},
				{
					label: t("app.menu.dark"),
					icon: "i-lucide-moon",
					type: "checkbox",
					checked: colorMode.value === "dark",
					onUpdateChecked(checked: boolean) {
						if (checked) colorMode.preference = "dark";
					},
					onSelect(e: Event) {
						e.preventDefault();
					},
				},
			],
		},
	],
	[
		{
			label: t("app.panel.logout"),
			icon: "i-lucide-log-out",
			onSelect: async () => {
				await $fetch("/api/auth/logout", { method: "POST" });
				await purgePlanaCaches();
				clear();
				await navigateTo(localePath("/dashboard/login"));
			},
		},
	],
]);

const initials = computed(() =>
	(user.value?.name ?? user.value?.username ?? "?")
		.split(" ")
		.map((part) => part.charAt(0))
		.slice(0, 2)
		.join("")
		.toUpperCase(),
);

const avatarSrc = computed(() =>
	user.value?.hasAvatar
		? `/api/users/${user.value.id}/avatar?v=${user.value.avatarVersion}`
		: undefined,
);

// El SW cachea HTML del dashboard (network-first); al cerrar sesión hay que
// purgar ese caché para no dejar datos personales en el navegador.
async function purgePlanaCaches() {
	if (!("caches" in window)) return;
	const keys = await caches.keys();
	await Promise.all(
		keys
			.filter((key) => key.startsWith("plana-"))
			.map((key) => caches.delete(key)),
	);
}
</script>

<template>
	<UDropdownMenu
		:items="items"
		:content="{ align: 'center', collisionPadding: 12 }"
		:ui="{
			content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)',
		}"
	>
		<UButton
			:label="collapsed ? undefined : (user?.name ?? user?.username)"
			:avatar="{ src: avatarSrc, alt: user?.name ?? '', text: initials }"
			trailing-icon="i-lucide-chevrons-up-down"
			color="neutral"
			variant="ghost"
			block
			:square="collapsed"
			class="data-[state=open]:bg-elevated"
			:ui="{ trailingIcon: 'text-dimmed' }"
		/>
	</UDropdownMenu>
</template>
