<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";
import { contact } from "~/data/contact";
import presupuesto from "~/data/presupuesto.json";

const { locale, t } = useI18n();
const localePath = useLocalePath();

const loc = computed(() => locale.value as "ca" | "es" | "en");

function pick<T extends Record<string, string>>(map: T, key: string): string {
	const direct = map[key as keyof T];
	if (direct) return direct;
	return map.en ?? map.es ?? map.ca ?? Object.values(map)[0] ?? "";
}

useHead({ title: () => t("homeVariant2.nav.contact") });
useSeoMeta({ description: () => t("about.contactCta") });

const contactCards = computed(() => [
	{
		icon: "call",
		label: contact.generalPhone,
		href: `tel:${contact.generalPhone.replace(/\s/g, "")}`,
		sublabel: t("about.phoneHours"),
	},
	...contact.phones.map((p) => ({
		icon: "location_city",
		label: p.phone,
		href: `tel:${p.phone.replace(/\s/g, "")}`,
		sublabel: pick(p.area, loc.value),
	})),
	{
		icon: "mail",
		label: "info@empresaplana.cat",
		href: "mailto:info@empresaplana.cat",
		sublabel: t("common.footer.contact"),
	},
	{
		icon: "chat",
		label: "WhatsApp",
		href: contact.whatsapp,
		sublabel: "+34 620 201 632",
	},
]);

const baseKeys = [
	"tarragona",
	"reus",
	"garraf",
	"calafell",
	"barcelona",
	"hospitalet",
] as const;

function labelFor(id: string): string {
	const field = presupuesto.fields.find((f) => f.id === id);
	return field ? pick(field.labels, loc.value) || id : id;
}

const schema = z.object({
	name: z.string().min(1).max(200),
	email: z.string().email().max(200),
	phone: z.string().max(30).optional().or(z.literal("")),
	message: z.string().min(1).max(2000),
	consent: z.boolean().refine((value) => value === true, {
		message: t("app.validation.consentRequired"),
	}),
});
type Schema = z.input<typeof schema>;

const state = reactive<Partial<Schema>>({
	name: "",
	email: "",
	phone: "",
	message: "",
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
				phone: d.phone ?? "",
				reasonId: "contact",
				description: d.message,
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
		<section class="bg-primary text-on-primary relative overflow-hidden">
			<div class="absolute -top-24 -right-24 w-96 h-96 bg-surface-tint rounded-full blur-3xl opacity-40 pointer-events-none"></div>
			<div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg md:py-16 relative">
				<p class="font-label-md text-label-md uppercase tracking-widest text-secondary-fixed mb-2">{{ t("discretionary.cta.areaTarragona") }}</p>
				<h1 class="font-display-lg text-display-lg-mobile md:text-display-lg font-bold mb-3">{{ t("homeVariant2.nav.contact") }}</h1>
				<p class="font-body-lg text-body-lg text-on-primary/85 max-w-2xl">{{ t("about.contactCta") }}</p>
			</div>
		</section>

		<!-- Contact info cards -->
		<section class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop -mt-8 relative z-10 mb-stack-lg">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<a
					v-for="card in contactCards"
					:key="card.label"
					:href="card.href"
					:target="card.href.startsWith('http') ? '_blank' : undefined"
					:rel="card.href.startsWith('http') ? 'noopener noreferrer' : undefined"
					class="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-ambient p-5 flex items-start gap-4 hover:-translate-y-0.5 hover:shadow-ambient-lg transition-all"
				>
					<span class="w-11 h-11 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined icon-filled text-[22px]">{{ card.icon }}</span>
					</span>
					<div class="min-w-0">
						<p class="font-headline-md text-headline-md font-bold text-deep-navy break-all">{{ card.label }}</p>
						<p class="font-body-md text-body-md text-on-surface-variant mt-0.5">{{ card.sublabel }}</p>
					</div>
				</a>
			</div>
		</section>

		<!-- Contact form -->
		<div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-stack-lg">
			<section class="mx-auto max-w-3xl rounded-xl border border-outline-variant bg-surface-container-lowest p-stack-md shadow-ambient md:p-stack-lg">
				<h2 class="mb-1 font-headline-lg text-headline-lg font-bold text-deep-navy">{{ t("homeVariant2.nav.contact") }}</h2>
				<p class="mb-stack-lg text-body-md text-on-surface-variant">{{ t("about.contactCta") }}</p>

				<UForm ref="form" :state="state" :schema="schema" class="space-y-4" @submit="onSubmit">
					<div class="grid gap-4 md:grid-cols-2">
						<UFormField :label="labelFor('name')" name="name" required>
							<UInput v-model="state.name" autocomplete="name" class="w-full" />
						</UFormField>
						<UFormField :label="labelFor('email')" name="email" required>
							<UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
						</UFormField>
						<UFormField :label="labelFor('phone')" name="phone">
							<UInput v-model="state.phone" type="tel" autocomplete="tel" class="w-full" />
						</UFormField>
					</div>

					<UFormField :label="pick(presupuesto.message, loc)" name="message" required>
						<UTextarea v-model="state.message" :rows="5" autoresize class="w-full" />
					</UFormField>

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
						<UButton type="submit" :loading="pending" class="bg-energetic-orange font-semibold min-h-[48px] text-white">
							{{ pick(presupuesto.contactSubmit, loc) }}
						</UButton>
						<UButton color="neutral" variant="outline" @click="form?.clear()">
							{{ t("common.clear") }}
						</UButton>
					</div>
				</UForm>
			</section>
		</div>

		<!-- Delegations -->
		<section class="bg-surface-gray w-full">
			<div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
				<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy mb-8">{{ t("locations.delegations.title") }}</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<div v-for="(key, i) in baseKeys" :key="key" class="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-ambient p-5 flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<span class="w-9 h-9 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center flex-shrink-0">
								<span class="material-symbols-outlined text-[18px]">business</span>
							</span>
							<div>
								<p class="font-label-md text-label-md text-coastal-teal uppercase tracking-wider">{{ t("locations.delegations.label").replace("{n}", String(i + 1)) }}</p>
								<p class="font-headline-md text-headline-md font-bold text-deep-navy">{{ t(`locations.delegations.bases.${key}.name`) }}</p>
							</div>
						</div>
						<p class="font-body-md text-body-md text-on-surface-variant">{{ t(`locations.delegations.bases.${key}.address`) }}</p>
						<p class="font-body-md text-body-md font-semibold text-on-surface">{{ t(`locations.delegations.bases.${key}.city`) }}</p>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
