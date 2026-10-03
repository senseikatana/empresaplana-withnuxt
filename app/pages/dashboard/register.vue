<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({ layout: "auth" });

const { t } = useI18n();
const localePath = useLocalePath();

const schema = z.object({
	name: z.string().min(1).max(60),
	username: z
		.string()
		.min(3)
		.max(60)
		.regex(/^[a-z0-9._-]+$/i, { message: "a-z, 0-9, . _ -" }),
	email: z.string().email().max(200),
	password: z.string().min(8).max(128),
});
type Schema = z.infer<typeof schema>;

const state = reactive<Partial<Schema>>({
	name: "",
	username: "",
	email: "",
	password: "",
});
const form = useTemplateRef("form");
const error = ref<string | null>(null);
const pending = ref(false);

useHead({
	title: t("app.register.title"),
	meta: [{ name: "robots", content: "noindex, nofollow" }],
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
	error.value = null;
	pending.value = true;
	try {
		await $fetch("/api/auth/register", { method: "POST", body: event.data });
		await navigateTo(localePath("/dashboard"));
	} catch (e) {
		const status = (e as { statusCode?: number })?.statusCode;
		const msg = (e as { data?: { statusMessage?: string } })?.data
			?.statusMessage;
		if (status === 409 || msg === "username_exists") {
			form.value?.setErrors([
				{ name: "username", message: t("app.register.taken") },
			]);
		} else {
			error.value = t("app.register.invalid");
		}
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
				<h1 class="text-xl font-bold text-deep-navy">{{ t("app.register.title") }}</h1>
				<p class="text-sm text-on-surface-variant">{{ t("app.register.subtitle") }}</p>
			</template>

			<UForm ref="form" :state="state" :schema="schema" class="flex flex-col gap-4" @submit="onSubmit">
				<UFormField :label="t('app.register.name')" name="name">
					<UInput v-model="state.name" autocomplete="name" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.register.username')" name="username">
					<UInput v-model="state.username" autocomplete="username" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.register.email')" name="email">
					<UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.register.password')" name="password">
					<UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
				</UFormField>

				<UAlert v-if="error" color="error" variant="soft" :title="error" />

				<UButton type="submit" :loading="pending" block>
					{{ t("app.register.submit") }}
				</UButton>
			</UForm>

			<template #footer>
				<p class="text-sm text-on-surface-variant">
					{{ t("app.register.haveAccount") }}
					<ULink :to="localePath('/dashboard/login')" class="font-medium text-deep-navy">
						{{ t("app.register.login") }}
					</ULink>
				</p>
			</template>
		</UCard>
	</div>
</template>
