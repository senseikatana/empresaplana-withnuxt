<script setup lang="ts">
/**
 * Campo de formulario con asistencia de IA: escribe el texto o pide que lo
 * genere el asistente (`POST /api/dashboard/assistant/generate`) y lo inserta.
 *
 * Es reutilizable en cualquier CRUD: solo hay que pasarle `field` (la clave
 * del campo) y, si la hay, `context` con el resto de la fila/formulario.
 */
const model = defineModel<string>({ default: "" });

const props = withDefaults(
	defineProps<{
		/** Clave del campo, p. ej. "bio", "name". Va al endpoint y al i18n. */
		field: string;
		label?: string;
		help?: string;
		placeholder?: string;
		/** Forma del texto generado. */
		kind?: "label" | "name" | "description";
		rows?: number;
		maxlength?: number;
		/** Contexto de la entidad (otros campos, tipo de registro…). */
		context?: string;
		disabled?: boolean;
	}>(),
	{ kind: "description", rows: 3 },
);

const { t, locale } = useI18n();

const pending = ref(false);
const error = ref<string | null>(null);
const generated = ref(false);

const canGenerate = computed(
	() => !pending.value && !props.disabled && localeSupported.value,
);

/** El endpoint solo acepta ca/es/en: en otro idioma no se ofrece el botón. */
const localeSupported = computed(() =>
	(["ca", "es", "en"] as const).includes(locale.value as "ca" | "es" | "en"),
);

async function generate() {
	if (!canGenerate.value) return;
	pending.value = true;
	error.value = null;
	generated.value = false;
	try {
		const { text } = await $fetch<{ text: string }>(
			"/api/dashboard/assistant/generate",
			{
				method: "POST",
				body: {
					field: props.field,
					kind: props.kind,
					locale: locale.value,
					context: props.context,
					existing: model.value || undefined,
				},
			},
		);
		model.value = text;
		generated.value = true;
	} catch (e) {
		// El endpoint responde con statusMessage; se muestra el texto genérico
		// para no filtrar detalles del proveedor al usuario.
		error.value = t("app.ai.error");
		if (import.meta.dev) console.warn("[ai-assist]", e);
	} finally {
		pending.value = false;
	}
}
</script>

<template>
	<UFormField :label="label" :help="help" :name="field">
		<div class="flex flex-col gap-2 w-full">
			<UTextarea
				v-model="model"
				:rows="rows"
				:maxlength="maxlength"
				:placeholder="placeholder"
				:disabled="pending || disabled"
				autoresize
				class="w-full"
			/>
			<div class="flex items-center justify-between gap-3">
				<p v-if="error" class="text-error text-sm">{{ error }}</p>
				<p v-else-if="generated" class="text-on-secondary-container text-sm">
					{{ t("app.ai.hint") }}
				</p>
				<span v-else></span>

				<UButton
					v-if="localeSupported"
					:label="pending ? t('app.ai.generating') : t('app.ai.generate')"
					icon="i-lucide-sparkles"
					size="xs"
					color="neutral"
					variant="soft"
					:loading="pending"
					:disabled="disabled"
					class="shrink-0"
					@click="generate"
				/>
			</div>
		</div>
	</UFormField>
</template>
