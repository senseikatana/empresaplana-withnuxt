<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import {
	GESTION_ENTITIES,
	type GestionField,
	type GestionResource,
} from "#shared/gestion";

/**
 * CRUD genérico dirigido por el registro `shared/gestion.ts`: lista con
 * buscador, modal de alta/edición y borrado. Los campos con `ai` en el
 * registro llevan el botón "Generar amb IA" (`AiAssistField`).
 *
 * El endpoint (`/api/gestion/{resource}`) valida con zod; aquí solo se hace
 * la comprobación de obligatorios para dar un mensaje claro antes de enviar.
 */
const props = defineProps<{ resource: GestionResource }>();

const { t } = useI18n();
const toast = useToast();

type Row = Record<string, unknown>;
type RouteOption = { id: string; code: string; name: string };

const config = computed(() => GESTION_ENTITIES[props.resource]);
const entityLabel = computed(() =>
	t(`app.gestion.entities.${config.value.entityKey}.label`),
);
const title = computed(() => t(`app.gestion.nav.${config.value.titleKey}`));

const fieldLabel = (field: GestionField) =>
	t(`app.gestion.entities.${config.value.entityKey}.fields.${field.key}`);
const statusLabel = (status: string) => t(`app.gestion.states.${status}`);

// ── Datos ───────────────────────────────────────────────────────────────
const { data: rows, refresh } = await useFetch<Row[]>(
	() => `/api/gestion/${props.resource}`,
	{ headers: useRequestHeaders(["cookie"]), default: () => [] },
);

const hasRouteField = computed(() =>
	config.value.fields.some((f) => f.type === "route"),
);

/** Solo se piden las rutas si la entidad tiene un campo de tipo `route`. */
const { data: routes } = await useFetch<RouteOption[]>("/api/fleet/routes", {
	headers: useRequestHeaders(["cookie"]),
	default: () => [],
});

const routeOptions = computed(() =>
	(routes.value ?? []).map((r) => ({
		label: `${r.code} · ${r.name}`,
		value: r.id,
	})),
);

const routeLabelById = computed(() => {
	const map = new Map<string, string>();
	for (const r of routes.value ?? []) map.set(r.id, r.code);
	return map;
});

// ── Lista ───────────────────────────────────────────────────────────────
const search = ref("");
const filtered = computed(() => {
	const q = search.value.trim().toLowerCase();
	if (!q) return rows.value ?? [];
	return (rows.value ?? []).filter((row) =>
		config.value.searchKeys.some((key) =>
			String(row[key] ?? "")
				.toLowerCase()
				.includes(q),
		),
	);
});

const hasStatus = computed(() =>
	config.value.fields.some((f) => f.key === "status"),
);

const fieldLabelByKey = computed(() => {
	const map = new Map<string, string>();
	for (const field of config.value.fields)
		map.set(field.key, fieldLabel(field));
	return map;
});

/** Columnas de la tabla: ruta (si aplica) + campos + estado + acciones. */
const columns = computed(() => {
	const cols: { id?: string; accessorKey?: string; header: string }[] = [];

	if (hasRouteField.value) {
		cols.push({
			id: "route",
			header: t("app.gestion.entities.schedule.fields.route"),
		});
	}
	for (const key of config.value.summary) {
		cols.push({
			accessorKey: key,
			header: fieldLabelByKey.value.get(key) ?? key,
		});
	}
	if (hasStatus.value) {
		cols.push({ id: "status", header: t("app.gestion.common.statusLabel") });
	}
	cols.push({ id: "actions", header: t("app.gestion.common.actions") });

	return cols;
});

/** Valor de una celda, recortado para que la tabla no se desborde. */
function cellValue(row: Row, key: string): string {
	const value = row[key];
	if (value === null || value === undefined || value === "") return "—";
	const text = String(value);
	return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/** Datos ya recortados: hay campos de hasta 1000 caracteres (`desc`). */
const tableData = computed(() =>
	filtered.value.map((row) => {
		const out: Row = { ...row };
		for (const key of config.value.summary) out[key] = cellValue(row, key);
		return out;
	}),
);

const statusColor = (status: string) =>
	status === "active"
		? "success"
		: status === "delayed"
			? "warning"
			: status === "maintenance"
				? "info"
				: "neutral";

// ── Formulario ──────────────────────────────────────────────────────────
const isOpen = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const editingId = ref<number | null>(null);
const form = ref<Record<string, unknown>>({});

const isEdit = computed(() => editingId.value !== null);

/** Valores iniciales coherentes con el tipo de cada campo. */
function defaults(): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const field of config.value.fields) {
		if (field.type === "select") {
			out[field.key] = field.literalOptions?.[0] ?? "";
		} else if (field.type === "number" || field.type === "route") {
			out[field.key] = null;
		} else {
			out[field.key] = "";
		}
	}
	return out;
}

function openCreate() {
	editingId.value = null;
	form.value = defaults();
	formError.value = null;
	isOpen.value = true;
}

function openEdit(row: Row) {
	editingId.value = Number(row.id);
	const next: Record<string, unknown> = {};
	for (const field of config.value.fields) {
		next[field.key] = row[field.key] ?? null;
	}
	form.value = next;
	formError.value = null;
	isOpen.value = true;
}

/** Contexto para el asistente: el resto de la fila en texto plano. */
const aiContext = computed(() => {
	const lines = [`Entitat: ${entityLabel.value}.`];
	for (const field of config.value.fields) {
		if (field.ai) continue;
		const value = form.value[field.key];
		if (value === null || value === undefined || value === "") continue;
		lines.push(`${fieldLabel(field)}: ${String(value)}`);
	}
	return lines.join("\n");
});

/** Payload limpio: números convertidos, `route` a null si está vacío. */
function payload(): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const field of config.value.fields) {
		const value = form.value[field.key];
		if (field.type === "number") {
			if (value === null || value === undefined || value === "") continue;
			out[field.key] = Number(value);
		} else if (field.type === "route") {
			out[field.key] = value ? String(value) : null;
		} else {
			out[field.key] = typeof value === "string" ? value.trim() : (value ?? "");
		}
	}
	return out;
}

async function save() {
	// Obligatorios primero, para dar el nombre del campo en el mensaje.
	for (const field of config.value.fields) {
		if (!field.required) continue;
		const value = form.value[field.key];
		if (value === null || value === undefined || String(value).trim() === "") {
			formError.value = `${fieldLabel(field)}: ${t("app.gestion.common.required")}`;
			return;
		}
	}

	saving.value = true;
	formError.value = null;
	try {
		const body = payload();
		if (editingId.value !== null) {
			await $fetch(`/api/gestion/${props.resource}/${editingId.value}`, {
				method: "PATCH",
				body,
				headers: useRequestHeaders(["cookie"]),
			});
		} else {
			await $fetch(`/api/gestion/${props.resource}`, {
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
		const statusMessage = (
			error as { statusMessage?: string; data?: { statusMessage?: string } }
		)?.statusMessage;
		formError.value =
			statusMessage === "number_exists"
				? `${t("app.gestion.entities.bus.fields.number")}: ${t("app.validation.conflict")}`
				: statusMessage === "route_not_found"
					? `${t("app.gestion.entities.schedule.fields.route")}: ${t("app.validation.conflict")}`
					: t("app.gestion.common.error");
	} finally {
		saving.value = false;
	}
}

async function remove(row: Row) {
	if (!confirm(t("app.gestion.common.confirmDelete"))) return;
	try {
		await $fetch(`/api/gestion/${props.resource}/${row.id}`, {
			method: "DELETE",
			headers: useRequestHeaders(["cookie"]),
		});
		await refresh();
		toast.add({
			color: "success",
			title: t("app.gestion.common.deleted"),
		});
	} catch {
		toast.add({ color: "error", title: t("app.gestion.common.error") });
	}
}

const rowMenu = (row: Row): DropdownMenuItem[][] => [
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
				{{ title }}
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

		<!-- Tabla con columnas (como el prototipo): cabeceras, filas con hover
		     y acciones por fila. -->
		<UCard v-else class="mt-6 p-0 overflow-hidden">
			<UTable :data="tableData" :columns="columns">
				<template #route-cell="{ row }">
					<UBadge
						v-if="row.original.routeId"
						color="neutral"
						variant="subtle"
					>
						{{ routeLabelById.get(String(row.original.routeId)) ?? row.original.routeId }}
					</UBadge>
					<span v-else class="text-dimmed">—</span>
				</template>

				<template #status-cell="{ row }">
					<UBadge
						v-if="row.original.status"
						:color="statusColor(String(row.original.status))"
						variant="subtle"
					>
						{{ statusLabel(String(row.original.status)) }}
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
					? t('app.gestion.common.editEntity', { entity: entityLabel })
					: t('app.gestion.common.newEntity', { entity: entityLabel })
			"
		>
			<template #body>
				<UForm :state="form" class="flex flex-col gap-4" @submit="save">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<template v-for="field in config.fields" :key="field.key">
							<!-- Campo de texto largo con asistencia IA: ocupa toda la fila -->
							<div v-if="field.ai" class="sm:col-span-2">
								<AiAssistField
									v-model="form[field.key] as string"
									:field="field.key"
									:kind="field.ai"
									:label="fieldLabel(field)"
									:maxlength="field.maxLength"
									:context="aiContext"
								/>
							</div>

							<UFormField
								v-else
								:label="fieldLabel(field)"
								:name="field.key"
								:required="field.required"
							>
								<USelect
									v-if="field.type === 'select'"
									v-model="form[field.key] as string"
									class="w-full"
									:items="
										(field.literalOptions ?? []).map((opt) => ({
											label: t(`${field.optionsI18n ?? 'app.gestion.states'}.${opt}`),
											value: opt,
										}))
									"
								/>
								<USelect
									v-else-if="field.type === 'route'"
									v-model="form[field.key] as string"
									class="w-full"
									:items="routeOptions"
									:placeholder="t('app.gestion.common.all')"
								/>
								<UInput
									v-else-if="field.type === 'number'"
									v-model="form[field.key] as string"
									type="number"
									class="w-full"
								/>
								<UInput
									v-else
									v-model="form[field.key] as string"
									class="w-full"
									:maxlength="field.maxLength"
								/>
							</UFormField>
						</template>
					</div>

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
