<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

/**
 * CRUD de rutas. Sustituye el placeholder de `[seccion].vue` para este
 * segmento (una página estática gana sobre la dinámica).
 *
 * El campo "Nom" usa `AiAssistField`: genera el nombre con el asistente a
 * partir del código y el trajecte.
 */
definePageMeta({ layout: "dashboard", capability: "fleet:manage" });

const { t, locale } = useI18n();
const toast = useToast();

type Route = {
	id: string;
	code: string;
	name: string;
	origin: string;
	destination: string;
	color: string;
	status: string;
};

const empty = {
	code: "",
	name: "",
	origin: "",
	destination: "",
	status: "active",
	color: "#013990",
};

const { data, refresh } = await useFetch<Route[]>("/api/fleet/routes", {
	headers: useRequestHeaders(["cookie"]),
	default: () => [],
});

const routes = computed(() => data.value ?? []);
const search = ref("");
const filtered = computed(() => {
	const q = search.value.trim().toLowerCase();
	if (!q) return routes.value;
	return routes.value.filter((r) =>
		[r.code, r.name, r.origin, r.destination].some((v) =>
			v.toLowerCase().includes(q),
		),
	);
});

// ── Formulario (crear / editar) ────────────────────────────────────────
const isOpen = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const editingId = ref<string | null>(null);
const form = ref({ ...empty });

const isEdit = computed(() => editingId.value !== null);
const entityLabel = computed(() => t("app.gestion.entities.route.label"));

/** Contexto que recibe el asistente para generar el nombre. */
const aiContext = computed(() =>
	[
		`Entitat: ruta d'autobús d'Empresa Plana.`,
		form.value.code ? `Codi: ${form.value.code}` : "",
		form.value.origin ? `Origen: ${form.value.origin}` : "",
		form.value.destination ? `Destí: ${form.value.destination}` : "",
	]
		.filter(Boolean)
		.join("\n"),
);

function openCreate() {
	editingId.value = null;
	form.value = { ...empty };
	formError.value = null;
	isOpen.value = true;
}

function openEdit(route: Route) {
	editingId.value = route.id;
	form.value = {
		code: route.code,
		name: route.name,
		origin: route.origin,
		destination: route.destination,
		status: route.status,
		color: route.color,
	};
	formError.value = null;
	isOpen.value = true;
}

async function save() {
	saving.value = true;
	formError.value = null;
	try {
		if (editingId.value) {
			await $fetch(`/api/fleet/routes/${editingId.value}`, {
				method: "PATCH",
				body: form.value,
				headers: useRequestHeaders(["cookie"]),
			});
		} else {
			await $fetch("/api/fleet/routes", {
				method: "POST",
				body: form.value,
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
		const statusMessage = (
			error as { statusMessage?: string; data?: { statusMessage?: string } }
		)?.statusMessage;
		formError.value =
			statusMessage === "code_exists"
				? `${t("app.gestion.entities.route.fields.code")}: ${t("app.validation.conflict")}`
				: t("app.gestion.common.error");
	} finally {
		saving.value = false;
	}
}

async function remove(route: Route) {
	if (!confirm(t("app.gestion.common.confirmDelete"))) return;
	try {
		const result = await $fetch<{ archived: boolean }>(
			`/api/fleet/routes/${route.id}`,
			{ method: "DELETE", headers: useRequestHeaders(["cookie"]) },
		);
		await refresh();
		toast.add({
			color: result.archived ? "warning" : "success",
			title: result.archived
				? t("app.gestion.common.archived")
				: t("app.gestion.common.deleted"),
		});
	} catch {
		toast.add({
			color: "error",
			title: t("app.gestion.common.error"),
		});
	}
}

const statusColor = (status: string) =>
	status === "active"
		? "success"
		: status === "delayed"
			? "warning"
			: status === "maintenance"
				? "info"
				: "neutral";

const columns = computed(() => [
	{ accessorKey: "code", header: t("app.gestion.entities.route.fields.code") },
	{ accessorKey: "name", header: t("app.gestion.entities.route.fields.name") },
	{
		accessorKey: "origin",
		header: t("app.gestion.entities.route.fields.origin"),
	},
	{
		accessorKey: "destination",
		header: t("app.gestion.entities.route.fields.destination"),
	},
	{ id: "status", header: t("app.gestion.common.statusLabel") },
	{ id: "actions", header: t("app.gestion.common.actions") },
]);

const tableData = computed(() => filtered.value);
</script>

<template>
	<div>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1
				class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy"
			>
				{{ t("app.gestion.nav.routes") }}
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

		<!-- Misma tabla que el CRUD genérico: cabeceras + filas con hover. -->
		<UCard v-else class="mt-6 p-0 overflow-hidden">
			<UTable :data="tableData" :columns="columns">
				<template #code-cell="{ row }">
					<span
						class="inline-flex items-center gap-2 rounded bg-primary/10 px-2 py-0.5 font-label-md text-label-md text-deep-navy"
					>
						<span
							class="size-2 rounded-full"
							:style="{ backgroundColor: row.original.color }"
						/>
						{{ row.original.code }}
					</span>
				</template>

				<template #name-cell="{ row }">
					<span class="font-medium text-highlighted">{{ row.original.name }}</span>
				</template>

				<template #status-cell="{ row }">
					<UBadge
						:color="statusColor(String(row.original.status))"
						variant="subtle"
					>
						{{ t(`app.gestion.states.${row.original.status}`) }}
					</UBadge>
				</template>

				<template #actions-cell="{ row }">
					<UDropdownMenu
						:items="
							[
								[
									{
										label: t('app.gestion.common.edit'),
										icon: 'i-lucide-pencil',
										onSelect: () => openEdit(row.original),
									},
								],
								[
									{
										label: t('app.gestion.common.delete'),
										icon: 'i-lucide-trash-2',
										onSelect: () => remove(row.original),
									},
								],
							] as DropdownMenuItem[][]
						"
						:content="{ align: 'end' }"
					>
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

		<UModal v-model:open="isOpen" :title="isEdit ? t('app.gestion.common.editEntity', { entity: entityLabel }) : t('app.gestion.common.newEntity', { entity: entityLabel })">
			<template #body>
				<UForm :state="form" class="flex flex-col gap-4" @submit="save">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<UFormField
							:label="t('app.gestion.entities.route.fields.code')"
							name="code"
						>
							<UInput v-model="form.code" class="w-full" :maxlength="20" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.common.statusLabel')"
							name="status"
						>
							<USelect
								v-model="form.status"
								class="w-full"
								:options="
									['active', 'delayed', 'maintenance', 'inactive'].map((s) => ({
										label: t(`app.gestion.states.${s}`),
										value: s,
									}))
								"
							/>
						</UFormField>
					</div>

					<!-- Campo con asistencia IA: genera el nombre a partir del
					     código y el trajecte. -->
					<AiAssistField
						v-model="form.name"
						field="name"
						kind="name"
						:label="t('app.gestion.entities.route.fields.name')"
						:context="aiContext"
						:maxlength="200"
					/>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<UFormField
							:label="t('app.gestion.entities.route.fields.origin')"
							name="origin"
						>
							<UInput v-model="form.origin" class="w-full" :maxlength="120" />
						</UFormField>
						<UFormField
							:label="t('app.gestion.entities.route.fields.destination')"
							name="destination"
						>
							<UInput
								v-model="form.destination"
								class="w-full"
								:maxlength="120"
							/>
						</UFormField>
					</div>

					<UFormField label="Color" name="color">
						<div class="flex items-center gap-3">
							<input
								v-model="form.color"
								type="color"
								class="h-9 w-12 cursor-pointer rounded border border-outline-variant bg-transparent"
								aria-label="Color"
							/>
							<UInput v-model="form.color" class="w-32" :maxlength="7" />
						</div>
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
