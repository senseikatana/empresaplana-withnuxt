<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({
	layout: "dashboard",
	capability: "dashboard:access",
});

const { t } = useI18n();
const toast = useToast();
const localePath = useLocalePath();
const { refresh: refreshSession } = useSession();

type AccountUser = {
	id: number;
	name: string;
	email: string;
	phone: string;
	bio: string;
	hasAvatar: boolean;
	avatarVersion: number;
};

const { data, refresh: refreshAccount } = await useFetch<{ user: AccountUser }>(
	"/api/account",
	{ headers: useRequestHeaders(["cookie"]) },
);

const state = reactive({
	name: data.value?.user?.name ?? "",
	email: data.value?.user?.email ?? "",
	phone: data.value?.user?.phone ?? "",
	bio: data.value?.user?.bio ?? "",
	currentPasskey: "",
	newPassword: "",
});

const baseSchema = z.object({
	name: z.string().min(1).max(60),
	email: z.string().email().max(200),
	phone: z.string().max(30).optional(),
	bio: z.string().max(280).optional(),
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
		const res = await $fetch<{ emailVerificationRequired?: boolean }>(
			"/api/account",
			{
				method: "PATCH",
				body: {
					name: value.name,
					email: value.email,
					phone: value.phone ?? "",
					bio: value.bio ?? "",
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
			},
		);
		state.currentPasskey = "";
		state.newPassword = "";
		if (res.emailVerificationRequired) {
			toast.add({
				title: t("app.verify.title"),
				description: t("app.verify.subtitle"),
				color: "warning",
				icon: "i-lucide-mail-check",
			});
			await navigateTo(localePath("/dashboard/pending"));
			return;
		}
		await Promise.all([refreshAccount(), refreshSession()]);
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

// ── Avatar ─────────────────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const showPreview = ref(false);
const uploading = ref(false);
const uploadError = ref<string | null>(null);

const avatarUrl = computed(() =>
	data.value?.user?.hasAvatar
		? `/api/users/${data.value.user.id}/avatar?v=${data.value.user.avatarVersion}`
		: undefined,
);

const initials = computed(() =>
	(state.name || data.value?.user?.name || "?")
		.split(" ")
		.map((part) => part.charAt(0))
		.slice(0, 2)
		.join("")
		.toUpperCase(),
);

function onFileClick() {
	fileInput.value?.click();
}

function onFileChange(e: Event) {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	const allowed = ["image/jpeg", "image/png", "image/webp"];
	if (!allowed.includes(file.type)) {
		toast.add({ title: t("app.panel.avatarTypeError"), color: "error" });
		input.value = "";
		return;
	}
	if (file.size > 2 * 1024 * 1024) {
		toast.add({ title: t("app.panel.avatarSizeError"), color: "error" });
		input.value = "";
		return;
	}

	selectedFile.value = file;
	previewUrl.value = URL.createObjectURL(file);
	uploadError.value = null;
	showPreview.value = true;
}

function cancelUpload() {
	if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
	selectedFile.value = null;
	previewUrl.value = null;
	showPreview.value = false;
	if (fileInput.value) fileInput.value.value = "";
}

async function confirmUpload() {
	if (!selectedFile.value) return;
	uploading.value = true;
	uploadError.value = null;
	try {
		const form = new FormData();
		form.append("file", selectedFile.value);
		await $fetch("/api/account/avatar", { method: "PUT", body: form });
		await Promise.all([refreshAccount(), refreshSession()]);
		toast.add({
			title: t("app.panel.saved"),
			color: "success",
			icon: "i-lucide-check",
		});
		cancelUpload();
	} catch {
		uploadError.value = t("app.panel.avatarUploadError");
	} finally {
		uploading.value = false;
	}
}

// Cerrar el modal con ESC o clic fuera también debe limpiar el selector
// (si no, el mismo archivo no vuelve a disparar `change`) y revocar el blob.
watch(showPreview, (isOpen) => {
	if (!isOpen) cancelUpload();
});

onUnmounted(() => {
	if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

<template>
	<div class="max-w-lg">
		<h1 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy">{{ t("app.panel.accountTitle") }}</h1>
		<p class="font-body-md text-body-md text-on-surface-variant mt-1">{{ t("app.panel.accountSubtitle") }}</p>

		<UCard class="mt-6">
			<div class="flex flex-wrap items-center gap-4">
				<UAvatar :src="avatarUrl" :alt="state.name" :text="initials" size="xl" />
				<div class="flex flex-col gap-1">
					<UButton :label="t('app.panel.avatarChoose')" color="neutral" variant="outline" @click="onFileClick" />
					<p class="text-xs text-on-surface-variant">{{ t("app.panel.avatarHelp") }}</p>
				</div>
				<input
					ref="fileInput"
					type="file"
					class="hidden"
					accept=".jpg,.jpeg,.png,.webp"
					@change="onFileChange"
				/>
			</div>

			<USeparator class="my-5" />

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
				<UFormField :label="t('app.panel.bio')" name="bio" :help="t('app.panel.bioHelp')">
					<UTextarea v-model="state.bio" :rows="3" autoresize class="w-full" :maxlength="280" />
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

		<AvatarConfirmModal
			v-model:open="showPreview"
			:preview-url="previewUrl"
			:name="state.name"
			:loading="uploading"
			:error="uploadError"
			@confirm="confirmUpload"
			@cancel="cancelUpload"
		/>
	</div>
</template>
