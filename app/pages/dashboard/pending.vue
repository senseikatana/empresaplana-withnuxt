<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

useHead({
	title: t("app.verify.title"),
	meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const { data } = await useFetch<{
	user: { name: string; email: string; emailVerified: boolean };
}>("/api/me", { headers: useRequestHeaders(["cookie"]) });

if (data.value?.user?.emailVerified) {
	await navigateTo(localePath("/dashboard"));
}

const sending = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

async function resend() {
	sending.value = true;
	error.value = null;
	try {
		await $fetch("/api/auth/resend-verification", { method: "POST" });
		sent.value = true;
	} catch {
		error.value = t("app.verify.error");
	} finally {
		sending.value = false;
	}
}

async function logout() {
	await $fetch("/api/auth/logout", { method: "POST" });
	await navigateTo(localePath("/dashboard/login"));
}
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-surface-container px-4">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="flex items-center gap-3">
					<span class="material-symbols-outlined text-deep-navy text-[28px]">mark_email_unread</span>
					<h1 class="text-xl font-bold text-deep-navy">{{ t("app.verify.title") }}</h1>
				</div>
				<p class="text-sm text-on-surface-variant mt-2">{{ t("app.verify.subtitle") }}</p>
			</template>

			<div class="flex flex-col gap-4">
				<p class="text-sm text-on-surface">
					{{ t("app.verify.body") }}
				</p>
				<p v-if="data?.user?.email" class="text-sm text-on-surface-variant">
					{{ t("app.verify.sentTo", { email: data.user.email }) }}
				</p>

				<UAlert v-if="sent" color="success" variant="soft" :title="t('app.verify.resent')" />
				<UAlert v-if="error" color="error" variant="soft" :title="error" />

				<p class="text-xs text-outline">{{ t("app.verify.note") }}</p>

				<UButton :loading="sending" block @click="resend">
					{{ t("app.verify.resend") }}
				</UButton>
				<UButton color="neutral" variant="ghost" block @click="logout">
					{{ t("app.verify.logout") }}
				</UButton>
			</div>
		</UCard>
	</div>
</template>
