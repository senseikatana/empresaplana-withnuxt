<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

/**
 * CRUD de usuarios. Página propia (no `GestionCrud`) porque tiene campos que
 * el CRUD genérico no cubre — contraseña, rol y verificación de correo — y
 * porque crear un usuario implica escribir también su `Account`.
 *
 * El endpoint (`/api/dashboard/users`) devuelve `{ users }`, no un array
 * como los de `/api/gestion/*`.
 */
definePageMeta({ layout: "dashboard", capability: "users:manage" });

const { t } = useI18n();
const toast = useToast();

type UserRow = {
	id: number;
	username: string;
	name: string;
	email: string;
	role: string;
	emailVerified: boolean;
	createdAt: string;
};

const { data, refresh } = await useFetch<{ users: UserRow[] }>(
	"/api/dashboard/users",
	{ headers: useRequestHeaders(["cookie"]), default: () => ({ users: [] }) },
);

const users = computed(() => data.value?.users ?? []);
const search = ref("");
const filtered = computed(() => {
	const q = search.value.trim().toLowerCase();
	if (!q) return users.value;
	return users.value.filter((u) =>
		[u.username, u.name, u.email, u.role].some((v) =>
			String(v ?? "")
				.toLowerCase()
				.includes(q),
		),
	);
});

const roleOptions = computed(() =>
	["client", "worker", "admin"].map((role) => ({
		label: t(`app.role.${role}`),
		value: role,
	})),
);

const columns = computed(() => [
	{
		accessorKey: "username",
		header: t("app.gestion.entities.user.fields.username"),
	},
	{ accessorKey: "name", header: t("app.gestion.entities.user.fields.name") },
	{ accessorKey: "email", header: t("app.gestion.entities.user.fields.email") },
	{ id: "role", header: t("app.gestion.entities.user.fields.role") },
	{
		id: "verified",
		header: t("app.gestion.entities.user.fields.emailVerified"),
	},
	{ id: "actions", header: t("app.gestion.common.actions") },
]);

// ── Formulario ──────────────────────────────────────────────────────────
const isOpen = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const editingId = ref<number | null>(null);

const emptyForm = () => ({
	username: "",
	name: "",
	email: "",
	phone: "",
	role: "client",
	password: "",
	emailVerified: false,
});
const form = ref(emptyForm());

const isEdit = computed(() => editingId.value !== null);

function openCreate() {
	editingId.value = null;
	form.value = emptyForm();
	formError.value = null;
	isOpen.value = true;
}

function openEdit(row: UserRow) {
	editingId.value = row.id;
	form.value = {
		...emptyForm(),
		username: row.username,
		name: row.name,
		email: row.email,
		role: row.role,
		emailVerified: row.emailVerified,
	};
	formError.value = null;
	isOpen.value = true;
}

/** Mensaje humano para los `statusMessage` que devuelve el endpoint. */
const ERROR_KEYS: Record<string, string> = {
	username_exists: "app.validation.usernameExists",
	email_exists: "app.validation.emailExists",
	cannot_delete_self: "app.validation.cannotDeleteSelf",
	cannot_demote_self: "app.validation.cannotDemoteSelf",
	last_admin: "app.validation.lastAdmin",
};

function errorMessage(statusMessage?: string): string {
	const key = statusMessage ? ERROR_KEYS[statusMessage] : undefined;
	return key ? t(key) : t("app.gestion.common.error");
}

async function save() {
	if (
		!form.value.username.trim() ||
		!form.value.name.trim() ||
		!form.value.email.trim()
	) {
		formError.value = `${t("app.gestion.entities.user.fields.username")}: ${t("app.gestion.common.required")}`;
		return;
	}
	if (!isEdit.value && form.value.password.length < 8) {
		formError.value = `${t("app.gestion.entities.user.fields.password")}: ${t("app.panel.passwordMin")}`;
		return;
	}

	saving.value = true;
	formError.value = null;
	try {
		const body: Record<string, unknown> = {
			username: form.value.username.trim(),
			name: form.value.name.trim(),
			email: form.value.email.trim(),
			phone: form.value.phone.trim(),
			role: form.value.role,
			emailVerified: form.value.emailVerified,
		};
		if (form.value.password) body.password = form.value.password;

		if (editingId.value !== null) {
			await $fetch(`/api/dashboard/users/${editingId.value}`, {
				method: "PATCH",
				body,
				headers: useRequestHeaders(["cookie"]),
			});
		} else {
			await $fetch("/api/dashboard/users", {
				method: "POST",
				body,
				headers: useRequestHeaders(["cookie"]),
			});
		}
		isOpen.value = false;
		await refresh();
		toast.add({
			color: "success",
			title: t(
				isEdit.value
					? "app.gestion.common.updated"
					: "app.gestion.common.created",
			),
		});
	} catch (error: unknown) {
		formError.value = errorMessage(
			(error as { statusMessage?: string; data?: { statusMessage?: string } })
				?.statusMessage,
		);
	} finally {
		saving.value = false;
	}
}

async function remove(row: UserRow) {
	if (!confirm(t("app.gestion.common.confirmDelete"))) return;
	try {
		await $fetch(`/api/dashboard/users/${row.id}`, {
			method: "DELETE",
			headers: useRequestHeaders(["cookie"]),
		});
		await refresh();
		toast.add({ color: "success", title: t("app.gestion.common.deleted") });
	} catch (error: unknown) {
		toast.add({
			color: "error",
			title: errorMessage(
				(error as { statusMessage?: string; data?: { statusMessage?: string } })
					?.statusMessage,
			),
		});
	}
}

const rowMenu = (row: UserRow): DropdownMenuItem[][] => [
	[
		{
			label: t("app.gestion.common.edit"),
			icon: "i-lucide-pencil",
			onSelect: () => openEdit(row),
		},
	],
	[
		{
			label: t("app.gestion.common.delete"),
			icon: "i-lucide-trash-2",
			onSelect: () => remove(row),
		},
	],
];
</script>

<template>
	<div>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1
				class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy"
			>
				{{ t("app.gestion.nav.users") }}
			</h1>
			<div class="flex items-center gap-2">
				<UInput
					v-model="search"
					icon="i-lucide-search"
					:placeholder="t('app.gestion.common.search')"
					class="w-48"
				/>
				<UButton
					:label="t('app.gestion.common.add')"
					icon="i-lucide-plus"
					@click="openCreate"
				/>
			</div>
		</div>

		<p
			v-if="!filtered.length"
			class="mt-8 rounded-lg bg-surface-container p-6 text-center text-on-surface-variant"
		>
			{{ t("app.gestion.common.empty") }}
		</p>

		<UCard v-else class="mt-6 p-0 overflow-hidden">
			<UTable :data="filtered" :columns="columns">
				<template #role-cell="{ row }">
					<UBadge color="neutral" variant="subtle">
						{{ t(`app.role.${row.original.role}`) }}
					</UBadge>
				</template>

				<template #verified-cell="{ row }">
					<UBadge
						:color="row.original.emailVerified ? 'success' : 'warning'"
						variant="subtle"
					>
						{{ row.original.emailVerified ? "✓" : "—" }}
					</UBadge>
				</template>

				<template #actions-cell="{ row }">
					<UDropdownMenu :items="rowMenu(row.original)" :content="{ align: 'end' }">
						<UButton
							icon="i-lucide-ellipsis-vertical"
							color="neutral"
							variant="ghost"
							size="xs"
							:aria-label="t('app.gestion.common.actions')"
						/>
					</UDropdownMenu>
				</template>
			</UTable>
		</UCard>

		<UModal
			v-model:open="isOpen"
			:title="
				isEdit
					? t('app.gestion.common.editEntity', { entity: t('app.gestion.entities.user.label') })
					: t('app.gestion.common.newEntity', { entity: t('app.gestion.entities.user.label') })
			"
		>
			<template #body>
				<UForm :state="form" class="flex flex-col gap-4" @submit="save">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<UFormField
							:label="t('app.gestion.entities.user.fields.username')"
							name="username"
							required
						>
							<UInput v-model="form.username" class="w-full" :maxlength="60" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.entities.user.fields.name')"
							name="name"
							required
						>
							<UInput v-model="form.name" class="w-full" :maxlength="60" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.entities.user.fields.email')"
							name="email"
							required
						>
							<UInput v-model="form.email" type="email" class="w-full" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.entities.user.fields.phone')"
							name="phone"
						>
							<UInput v-model="form.phone" class="w-full" :maxlength="30" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.entities.user.fields.role')"
							name="role"
						>
							<USelect v-model="form.role" :items="roleOptions" class="w-full" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.entities.user.fields.password')"
							name="password"
							:help="isEdit ? t('app.panel.currentHelp') : undefined"
							:required="!isEdit"
						>
							<UInput
								v-model="form.password"
								type="password"
								autocomplete="new-password"
								class="w-full"
							/>
						</UFormField>
					</div>

					<UFormField
						:label="t('app.gestion.entities.user.fields.emailVerified')"
						name="emailVerified"
					>
						<USwitch v-model="form.emailVerified" />
					</UFormField>

					<UAlert v-if="formError" color="error" variant="soft" :title="formError" />

					<div class="flex justify-end gap-2">
						<UButton
							:label="t('app.gestion.common.cancel')"
							color="neutral"
							variant="ghost"
							@click="isOpen = false"
						/>
						<UButton
							type="submit"
							:label="t('app.gestion.common.save')"
							:loading="saving"
						/>
					</div>
				</UForm>
			</template>
		</UModal>
	</div>
</template>
