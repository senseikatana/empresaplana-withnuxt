<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({
	layout: "dashboard",
	capability: "dashboard:access",
});

const { t } = useI18n();
const toast = useToast();

const { data } = await useFetch<{
	user: { name: string; email: string; phone: string };
}>("/api/account", { headers: useRequestHeaders(["cookie"]) });

const state = reactive({
	name: data.value?.user?.name ?? "",
	email: data.value?.user?.email ?? "",
	phone: data.value?.user?.phone ?? "",
	currentPasskey: "",
	newPassword: "",
});

const baseSchema = z.object({
	name: z.string().min(1).max(60),
	email: z.string().email().max(200),
	phone: z.string().max(30).optional(),
	currentPasskey: z.string().max(128).optional(),
	newPassword: z.string().max(128).optional(),
});
type Schema = z.infer<typeof baseSchema>;

// Mismas reglas que el servidor: cambio de email o contraseña exige la actual.
const schema = computed(() =>
	baseSchema.superRefine((value, ctx) => {
		if (value.newPassword && value.newPassword.length < 8) {
			ctx.addIssue({
				code: "custom",
				path: ["newPassword"],
				message: t("app.panel.passwordMin"),
			});
		}
		const sensitive =
			value.email !== (data.value?.user?.email ?? "") ||
			Boolean(value.newPassword);
		if (sensitive && !value.currentPasskey) {
			ctx.addIssue({
				code: "custom",
				path: ["currentPasskey"],
				message: t("app.panel.currentRequired"),
			});
		}
	}),
);

const error = ref<string | null>(null);
const pending = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
	const value = event.data;
	error.value = null;
	pending.value = true;
	try {
		await $fetch("/api/account", {
			method: "PATCH",
			body: {
				name: value.name,
				email: value.email,
				phone: value.phone ?? "",
				...(value.newPassword
					? {
							currentPasskey: value.currentPasskey,
							newPassword: value.newPassword,
						}
					: {}),
				...(!value.newPassword &&
				value.email !== data.value?.user?.email &&
				value.currentPasskey
					? { currentPasskey: value.currentPasskey }
					: {}),
			},
		});
		state.currentPasskey = "";
		state.newPassword = "";
		toast.add({
			title: t("app.panel.saved"),
			color: "success",
			icon: "i-lucide-check",
		});
	} catch {
		error.value = t("app.register.invalid");
	} finally {
		pending.value = false;
	}
}
</script>

<template>
	<div class="max-w-lg">
		<h1 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy">{{ t("app.panel.accountTitle") }}</h1>
		<p class="font-body-md text-body-md text-on-surface-variant mt-1">{{ t("app.panel.accountSubtitle") }}</p>

		<UCard class="mt-6">
			<UForm :state="state" :schema="schema" class="flex flex-col gap-4" @submit="onSubmit">
				<UFormField :label="t('app.panel.name')" name="name">
					<UInput v-model="state.name" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.panel.email')" name="email">
					<UInput v-model="state.email" type="email" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.panel.phone')" name="phone">
					<UInput v-model="state.phone" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.panel.password')" name="currentPasskey" :help="t('app.panel.currentHelp')">
					<UInput v-model="state.currentPasskey" type="password" autocomplete="current-password" class="w-full" />
				</UFormField>
				<UFormField :label="t('app.panel.newPassword')" name="newPassword">
					<UInput v-model="state.newPassword" type="password" autocomplete="new-password" class="w-full" />
				</UFormField>

				<UAlert v-if="error" color="error" variant="soft" :title="error" />

				<UButton type="submit" :loading="pending" class="self-start">
					{{ t("app.panel.save") }}
				</UButton>
			</UForm>
		</UCard>
	</div>
</template>
