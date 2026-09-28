<script setup lang="ts">
const { t } = useI18n();
const { isNotificationsSlideoverOpen } = useDashboard();

type FleetNotification = {
	id: number;
	type: string;
	title: string;
	desc: string;
	createdAt: string;
	read: boolean;
	routeId: string | null;
};

const { data: notifications } = await useFetch<FleetNotification[]>(
	"/api/fleet/notifications",
	{
		headers: useRequestHeaders(["cookie"]),
		default: () => [],
	},
);

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function timeAgo(value: string): string {
	const diffMs = Date.now() - new Date(value).getTime();
	const minutes = Math.round(diffMs / 60_000);
	if (Math.abs(minutes) < 60) return relative.format(-minutes, "minute");
	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) return relative.format(-hours, "hour");
	return relative.format(-Math.round(hours / 24), "day");
}
</script>

<template>
	<USlideover v-model:open="isNotificationsSlideoverOpen" :title="t('app.panel.notifications')">
		<template #body>
			<div v-if="!notifications.length" class="flex flex-col items-center justify-center py-12 text-center text-muted">
				<span class="i-lucide-bell-off text-3xl mb-3" />
				<p class="text-sm">{{ t("app.panel.noNotifications") }}</p>
			</div>

			<article
				v-for="notification in notifications"
				:key="notification.id"
				class="px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 relative -mx-3 first:-mt-3 last:-mb-3"
			>
				<UChip color="error" :show="!notification.read" inset>
					<span class="i-lucide-bell text-lg text-muted" />
				</UChip>

				<div class="text-sm flex-1">
					<p class="flex items-center justify-between gap-3">
						<span class="text-highlighted font-medium">{{ notification.title }}</span>
						<time
							:datetime="notification.createdAt"
							class="text-muted text-xs"
							v-text="timeAgo(notification.createdAt)"
						/>
					</p>
					<p class="text-dimmed">{{ notification.desc }}</p>
				</div>
			</article>
		</template>
	</USlideover>
</template>
