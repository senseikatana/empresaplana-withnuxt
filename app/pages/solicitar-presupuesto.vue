<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";
import presupuesto from "~/data/presupuesto.json";

const { locale, t } = useI18n();
const localePath = useLocalePath();

const loc = computed(() => locale.value as "ca" | "es" | "en" | "fr");

function pick<T extends Record<string, string>>(map: T, key: string): string {
	const direct = map[key as keyof T];
	if (direct) return direct;
	return map.en ?? map.es ?? map.ca ?? Object.values(map)[0] ?? "";
}

useHead({ title: () => pick(presupuesto.title, loc.value) });
useSeoMeta({
	description: () => pick(presupuesto.sections.service, loc.value),
});

function labelFor(id: string): string {
	const field = presupuesto.fields.find((f) => f.id === id);
	return field ? pick(field.labels, loc.value) || id : id;
}

const reasonItems = computed(() =>
	presupuesto.reasons.map((r) => ({
		label: pick(r.labels, loc.value),
		value: r.id,
	})),
);

// Los componentes de fecha/hora trabajan con objetos de @internationalized/date;
// la API espera strings (YYYY-MM-DD / HH:MM).
function toIsoDate(value: unknown): string {
	if (!value) return "";
	if (typeof value === "string") return value.slice(0, 10);
	return String(value).slice(0, 10);
}

function toHm(value: unknown): string {
	if (!value) return "";
	if (typeof value === "string") return value.slice(0, 5);
	return String(value).slice(0, 5);
}

const dateField = z.any().transform(toIsoDate);
const timeField = z.any().transform(toHm);

const schema = z.object({
	name: z.string().min(1).max(200),
	email: z.string().email().max(200),
	phone: z.string().min(1).max(30),
	company: z.string().max(200).optional().or(z.literal("")),
	reasonId: z.string().min(1).max(60),
	description: z.string().min(1).max(2000),
	departureCity: z.string().max(120).optional().or(z.literal("")),
	departureDay: dateField,
	departureTime: timeField,
	arrivalCity: z.string().max(120).optional().or(z.literal("")),
	arrivalDay: dateField,
	arrivalTime: timeField,
	people: z.number().int().min(1).max(60).optional(),
	consent: z.boolean().refine((value) => value === true, {
		message: t("app.validation.consentRequired"),
	}),
});
type Schema = z.input<typeof schema>;

const state = reactive<Partial<Schema>>({
	name: "",
	email: "",
	phone: "",
	company: "",
	reasonId: "",
	description: "",
	departureCity: "",
	arrivalCity: "",
	consent: false,
});

const form = useTemplateRef("form");
const pending = ref(false);
const error = ref<string | null>(null);
const sent = ref(false);

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
	const d = event.data;
	error.value = null;
	pending.value = true;
	try {
		await $fetch("/api/budget", {
			method: "POST",
			body: {
				name: d.name,
				email: d.email,
				phone: d.phone,
				company: d.company ?? "",
				reasonId: d.reasonId,
				description: d.description,
				departureCity: d.departureCity ?? "",
				departureDay: d.departureDay,
				departureTime: d.departureTime,
				arrivalCity: d.arrivalCity ?? "",
				arrivalDay: d.arrivalDay,
				arrivalTime: d.arrivalTime,
				people: d.people ? String(d.people) : "",
			},
		});
		sent.value = true;
		form.value?.clear();
	} catch {
		error.value = t("app.register.invalid");
	} finally {
		pending.value = false;
	}
}
</script>

<template>
	<div>
		<!-- Hero -->
		<section class="bg-deep-navy text-on-primary relative overflow-hidden">
			<div class="absolute -top-24 -right-24 w-96 h-96 bg-surface-tint rounded-full blur-3xl opacity-40 pointer-events-none"></div>
			<div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg md:py-16 relative">
				<p class="font-label-md text-label-md uppercase tracking-widest text-secondary-fixed mb-2">{{ t("discretionary.cta.areaTarragona") }}</p>
				<h1 class="font-display-lg text-display-lg-mobile md:text-display-lg font-bold mb-3">{{ pick(presupuesto.title, loc) }}</h1>
				<p class="font-body-lg text-body-lg text-on-primary/85 max-w-2xl">{{ t("about.contactCta") }}</p>
			</div>
		</section>

		<!-- Quote form -->
		<div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
			<section class="mx-auto max-w-3xl rounded-xl border border-outline-variant bg-surface-container-lowest p-stack-md shadow-ambient md:p-stack-lg">
				<h2 class="mb-stack-sm font-headline-lg text-headline-lg font-bold text-deep-navy">{{ pick(presupuesto.title, loc) }}</h2>
				<p class="mb-stack-lg text-body-md text-on-surface-variant">{{ pick(presupuesto.sections.service, loc) }}</p>

				<UForm ref="form" :state="state" :schema="schema" class="space-y-8" @submit="onSubmit">
					<!-- Contacto -->
					<fieldset class="space-y-4">
						<legend class="mb-1 font-headline-md text-headline-md font-bold text-deep-navy">{{ pick(presupuesto.sections.contact, loc) }}</legend>
						<div class="grid gap-4 md:grid-cols-2">
							<UFormField :label="labelFor('name')" name="name" required>
								<UInput v-model="state.name" autocomplete="name" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('email')" name="email" required>
								<UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('phone')" name="phone" required>
								<UInput v-model="state.phone" type="tel" autocomplete="tel" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('company')" name="company">
								<UInput v-model="state.company" autocomplete="organization" class="w-full" />
							</UFormField>
						</div>
					</fieldset>

					<!-- Servicio -->
					<fieldset class="space-y-4">
						<legend class="mb-1 font-headline-md text-headline-md font-bold text-deep-navy">{{ pick(presupuesto.sections.service, loc) }}</legend>
						<UFormField :label="labelFor('reason')" name="reasonId" required>
							<USelect
								v-model="state.reasonId"
								:items="reasonItems"
								:placeholder="pick(presupuesto.fields[4]?.placeholder ?? { es: '' }, loc)"
								class="w-full"
							/>
						</UFormField>
						<UFormField :label="labelFor('description')" name="description" required>
							<UTextarea v-model="state.description" :rows="4" autoresize class="w-full" />
						</UFormField>
						<div class="grid gap-4 md:grid-cols-2">
							<UFormField :label="labelFor('departureCity')" name="departureCity">
								<UInput v-model="state.departureCity" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('arrivalCity')" name="arrivalCity">
								<UInput v-model="state.arrivalCity" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('departureDay')" name="departureDay">
								<UInputDate v-model="state.departureDay" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('arrivalDay')" name="arrivalDay">
								<UInputDate v-model="state.arrivalDay" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('departureTime')" name="departureTime">
								<UInputTime v-model="state.departureTime" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('arrivalTime')" name="arrivalTime">
								<UInputTime v-model="state.arrivalTime" class="w-full" />
							</UFormField>
							<UFormField :label="labelFor('people')" name="people">
								<UInputNumber v-model="state.people" :min="1" :max="60" class="w-full" />
							</UFormField>
						</div>
					</fieldset>

					<UFormField name="consent">
						<UCheckbox v-model="state.consent">
							<template #label>
								<span class="text-body-md text-on-surface-variant">
									{{ pick(presupuesto.consent, loc) }}
									<NuxtLink :to="localePath('/politica-privacidad')" class="text-deep-navy underline">
										{{ t("common.footer.privacy") }}
									</NuxtLink>
								</span>
							</template>
						</UCheckbox>
					</UFormField>

					<UAlert v-if="sent" color="success" variant="soft" :title="pick(presupuesto.success, loc)" />
					<UAlert v-if="error" color="error" variant="soft" :title="error" />

					<div class="flex flex-wrap gap-3">
						<UButton type="submit" :loading="pending" class="bg-energetic-orange text-on-primary font-semibold min-h-[48px]">
							{{ pick(presupuesto.submit, loc) }}
						</UButton>
						<UButton color="neutral" variant="outline" @click="form?.clear()">
							{{ t("common.clear") }}
						</UButton>
					</div>
				</UForm>
			</section>
		</div>
	</div>
</template>
