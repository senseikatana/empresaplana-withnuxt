<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const localePath = useLocalePath();
const {
	public: { demoLogin },
} = useRuntimeConfig();

const schema = z.object({
	username: z.string().min(3).max(60),
	passkey: z.string().min(8).max(128),
});
type Schema = z.infer<typeof schema>;

const state = reactive<Partial<Schema>>({ username: "", passkey: "" });
const error = ref<string | null>(null);
const pending = ref(false);

// Las credenciales demo son las del seed (DEMO_USERS en prisma/seed-data/seed.ts),
// normalizadas a passkey única para la demo del cliente.
const demoAccounts = [
	{ username: "cliente", roleKey: "asClient", icon: "person" },
	{ username: "trabajador", roleKey: "asWorker", icon: "badge" },
	{ username: "admin", roleKey: "asBoss", icon: "admin_panel_settings" },
];

useHead({
	title: t("app.auth.welcome"),
	meta: [{ name: "robots", content: "noindex, nofollow" }],
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
	await login(event.data.username, event.data.passkey);
}

async function login(username: string, passkey: string) {
	error.value = null;
	pending.value = true;
	try {
		await $fetch("/api/auth/login", {
			method: "POST",
			body: { username, passkey },
		});
		await navigateTo(localePath("/dashboard"));
	} catch {
		error.value = t("app.auth.invalid");
	} finally {
		pending.value = false;
	}
}
</script>

<template>
	<!-- el centrado y el fondo los aporta layouts/auth.vue -->
	<div class="w-full max-w-sm">
		<UCard>
			<template #header>
				<h1 class="text-xl font-bold text-deep-navy">{{ t("app.auth.welcome") }}</h1>
				<p class="text-sm text-on-surface-variant">{{ t("app.auth.subtitle") }}</p>
			</template>

			<UForm :state="state" :schema="schema" class="flex flex-col gap-4" @submit="onSubmit">
				<UFormField :label="t('app.auth.username')" name="username">
					<UInput v-model="state.username" autocomplete="username" placeholder="admin" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.auth.passkey')" name="passkey">
					<UInput v-model="state.passkey" type="password" autocomplete="current-password" placeholder="••••••••" class="w-full" />
				</UFormField>

				<UAlert v-if="error" color="error" variant="soft" :title="error" />

				<UButton type="submit" :loading="pending" block>
					{{ t("app.auth.login") }}
				</UButton>
			</UForm>

			<div v-if="demoLogin" class="mt-6 border-t border-surface-variant pt-4">
				<p class="text-xs text-on-surface-variant mb-2">{{ t("app.auth.demoHint") }}</p>
				<div class="flex flex-col gap-2">
					<UButton
						v-for="account in demoAccounts"
						:key="account.username"
						color="neutral"
						variant="soft"
						block
						:disabled="pending"
						@click="login(account.username, '12345678')"
					>
						{{ t(`app.auth.${account.roleKey}`) }}
					</UButton>
				</div>
			</div>

			<template #footer>
				<p class="text-sm text-on-surface-variant">
					<ULink :to="localePath('/dashboard/register')" class="font-medium text-deep-navy">
						{{ t("app.register.title") }}
					</ULink>
				</p>
			</template>
		</UCard>
	</div>
</template>
