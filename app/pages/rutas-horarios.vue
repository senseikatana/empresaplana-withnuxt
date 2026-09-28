<script setup lang="ts">
import popularLines from "~/data/popular-lines.json";

const { locale, t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();

useHead({ title: () => t("routes.title") });
useSeoMeta({ description: () => t("routes.hero.subtitle") });

type StopTime = { town: string; stop: string; time: string };
type Price = { id: string; name: string; priceCents: number };
type Result = {
	lineId: number;
	signNumber: string | null;
	lineName: string;
	slug: string;
	pdfUrl: string | null;
	paymentSystem: string;
	departure: string;
	arrival: string;
	durationMin: number;
	originStop: string;
	destinationStop: string;
	stops: StopTime[];
	zones: number | null;
	price: Price[] | null;
};
type Transfer = {
	transferTown: string;
	waitMin: number;
	totalDurationMin: number;
	zones: number | null;
	price: Price[] | null;
	legs: Result[];
};
type SearchResponse = {
	query: { from: string; to: string; time: string | null; date: string | null; type: string };
	dayType: string;
	referenceDate: string;
	direct: Result[];
	transfers: Transfer[];
};

const origin = ref((route.query.from as string) ?? "Cambrils");
const destination = ref((route.query.to as string) ?? "");
const date = ref((route.query.date as string) ?? "");
const timeFrom = ref((route.query.time as string) ?? "");
const searchType = ref<"direct" | "transfer">(
	(route.query.type as string) === "transfer" ? "transfer" : "direct",
);

const towns = ref<string[]>([]);
const results = ref<SearchResponse | null>(null);
const searching = ref(false);
const searched = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
	try {
		towns.value = await $fetch<string[]>("/api/routes/localities");
	} catch {
		towns.value = [];
	}
	if (origin.value && destination.value) {
		await search();
	}
});

async function search() {
	error.value = null;
	searched.value = true;
	if (!origin.value.trim() || !destination.value.trim()) {
		error.value = t("routes.results.missingSelection");
		return;
	}
	searching.value = true;
	results.value = null;
	try {
		await navigateTo(
			{
				query: {
					from: origin.value,
					to: destination.value,
					...(timeFrom.value ? { time: timeFrom.value } : {}),
					...(date.value ? { date: date.value } : {}),
					...(searchType.value === "transfer" ? { type: "transfer" } : {}),
				},
			},
			{ replace: true },
		);
		results.value = await $fetch<SearchResponse>("/api/routes/search", {
			query: {
				from: origin.value,
				to: destination.value,
				...(timeFrom.value ? { time: timeFrom.value } : {}),
				...(date.value ? { date: date.value } : {}),
				type: searchType.value,
			},
		});
	} catch {
		error.value = t("routes.results.databaseError");
	} finally {
		searching.value = false;
	}
}

function formatPrice(cents: number): string {
	return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function lineBadge(result: Result): string {
	if (result.signNumber) return `L${result.signNumber}`;
	return result.lineName.split(" ").slice(0, 4).join(" ");
}

const lineIcons: Record<string, string> = {
	barcelonaAirport: "flight_takeoff",
	tarragonaBarcelona: "location_city",
	costaDorada: "beach_access",
	penedes: "map",
	estacioCamp: "train",
	ametllaTortosa: "alt_route",
	reusSalou: "directions_bus",
	tarragonaVilasecaSalou: "tour",
};

const popularCards = popularLines.lines.map((line) => ({
	name: line.name,
	origin: line.origin,
	destination: line.destination,
	icon: lineIcons[line.id] ?? "directions_bus",
	pdfUrl:
		(line.pdfUrls as Record<string, string | undefined>)[locale.value] ??
		line.pdfUrls.es ??
		line.pdfUrls.en ??
		line.pdfUrls.ca,
}));
</script>

<template>
	<div>
		<!-- Hero + Search -->
		<section class="relative w-full pt-12 pb-16 px-margin-mobile md:px-margin-desktop flex flex-col items-center justify-center bg-surface-container-low border-b border-outline-variant/30">
			<div class="w-full max-w-container-max mx-auto flex flex-col gap-stack-lg items-center">
				<div class="text-center max-w-3xl">
					<h1 class="font-display-lg text-display-lg md:text-[56px] leading-tight mb-4 text-deep-navy">{{ t("routes.hero.title") }}</h1>
					<p class="font-body-lg text-body-lg text-on-surface-variant">{{ t("routes.hero.subtitle") }}</p>
				</div>

				<div class="w-full max-w-5xl bg-surface-container-lowest rounded-xl ambient-shadow border border-outline-variant/30 p-6 md:p-8">
					<h2 class="font-headline-md text-headline-md text-deep-navy flex items-center gap-2 mb-6 border-b border-outline-variant/30 pb-4">
						<span class="material-symbols-outlined">directions_bus</span>
						<span>{{ t("routes.search.title") }}</span>
					</h2>
					<form class="flex flex-col gap-6" @submit.prevent="search">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div class="flex flex-col gap-2">
								<label class="font-label-md text-label-md text-on-surface-variant" for="route-origin">{{ t("routes.search.originLabel") }}</label>
								<div class="relative">
									<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">location_on</span>
									<input id="route-origin" v-model="origin" list="towns-list" :placeholder="t('routes.search.originPlaceholder')" class="w-full pl-10 pr-4 py-3 rounded border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal transition-colors font-body-md text-body-md" />
								</div>
							</div>
							<div class="flex flex-col gap-2">
								<label class="font-label-md text-label-md text-on-surface-variant" for="route-destination">{{ t("routes.search.destinationLabel") }}</label>
								<div class="relative">
									<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">pin_drop</span>
									<input id="route-destination" v-model="destination" list="towns-list" :placeholder="t('routes.search.destinationPlaceholder')" class="w-full pl-10 pr-4 py-3 rounded border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal transition-colors font-body-md text-body-md" />
								</div>
							</div>
							<div class="flex flex-col gap-2">
								<label class="font-label-md text-label-md text-on-surface-variant" for="route-date">{{ t("routes.search.dateLabel") }}</label>
								<input id="route-date" v-model="date" type="date" class="w-full pl-4 pr-4 py-3 rounded border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal transition-colors font-body-md text-body-md" />
							</div>
							<div class="flex flex-col gap-2">
								<label class="font-label-md text-label-md text-on-surface-variant" for="route-time">{{ t("routes.search.timeLabel") }}</label>
								<input id="route-time" v-model="timeFrom" type="time" class="w-full pl-4 pr-4 py-3 rounded border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal transition-colors font-body-md text-body-md" />
							</div>
						</div>
						<datalist id="towns-list">
							<option v-for="town in towns" :key="town" :value="town" />
						</datalist>

						<div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2 border-t border-outline-variant/30">
							<div class="flex items-center gap-6">
								<label class="flex items-center gap-2 cursor-pointer">
									<input v-model="searchType" type="radio" value="direct" class="w-4 h-4 text-coastal-teal" />
									<span class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.search.direct") }}</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input v-model="searchType" type="radio" value="transfer" class="w-4 h-4 text-coastal-teal" />
									<span class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.search.withTransfers") }}</span>
								</label>
							</div>
							<UButton type="submit" :loading="searching" class="bg-energetic-orange text-on-primary font-button min-h-[48px]">
								<span class="material-symbols-outlined">search</span>
								{{ t("routes.search.submit") }}
							</UButton>
						</div>
					</form>
					<p class="text-xs text-outline mt-4 italic">{{ t("routes.search.disclaimer") }}</p>
				</div>
			</div>
		</section>

		<!-- Results -->
		<section v-if="searched" id="results" class="w-full py-16 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest border-t border-outline-variant/20">
			<div class="max-w-container-max mx-auto">
				<h2 class="font-headline-lg text-headline-lg text-deep-navy mb-2">{{ t("routes.results.title") }}</h2>
				<p class="font-body-lg text-body-lg text-on-surface-variant mb-8 flex items-center gap-2 flex-wrap">
					{{ t("routes.results.summaryLabel") }}:
					<strong class="text-deep-navy">{{ origin }}</strong>
					<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
					<strong class="text-deep-navy">{{ destination }}</strong>
					<span v-if="results" class="text-sm text-outline">· {{ t("routes.results.resultsCount", { count: results.direct.length }) }}</span>
				</p>

				<UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-8" />

				<div v-else-if="searching" class="py-12 text-center text-on-surface-variant">
					<span class="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
					<p class="mt-3">{{ t("routes.results.searchingInfo") }}</p>
				</div>

				<div v-else-if="results && results.direct.length === 0 && results.transfers.length === 0" class="bg-surface-container-low rounded-xl p-10 text-center border border-outline-variant/30">
					<span class="material-symbols-outlined text-[40px] text-outline">search_off</span>
					<h3 class="font-headline-md text-headline-md text-deep-navy mt-3">{{ t("routes.results.emptyTitle") }}</h3>
					<p class="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl mx-auto">{{ t("routes.results.emptyBody") }}</p>
					<p class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.results.emptyHint") }}</p>
				</div>

				<div v-else-if="results" class="flex flex-col gap-10">
					<!-- Direct -->
					<div v-if="results.direct.length" class="flex flex-col gap-4">
						<h3 class="font-headline-md text-headline-md text-deep-navy flex items-center gap-2">
							<span class="material-symbols-outlined text-coastal-teal">alt_route</span>
							{{ t("routes.results.directTitle") }} ({{ results.direct.length }})
						</h3>
						<article v-for="(r, i) in results.direct" :key="`${r.lineId}-${r.departure}-${i}`" class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 ambient-shadow overflow-hidden">
							<div class="flex flex-col md:flex-row md:items-center gap-4 p-5">
								<div class="flex items-center gap-3 md:w-56">
									<span class="inline-flex items-center justify-center rounded-lg bg-deep-navy text-on-primary font-label-md text-label-md px-3 py-1.5 min-w-[52px]">{{ lineBadge(r) }}</span>
									<span class="font-body-md text-body-md text-on-surface-variant line-clamp-2">{{ r.lineName }}</span>
								</div>
								<div class="flex items-center gap-4 md:flex-1">
									<div class="text-center">
										<p class="font-headline-md text-headline-md font-bold text-deep-navy">{{ r.departure }}</p>
										<p class="text-xs text-outline truncate max-w-[140px]">{{ r.originStop }}</p>
									</div>
									<div class="flex-1 flex flex-col items-center text-outline">
										<span class="text-xs">{{ r.durationMin }} min</span>
										<div class="w-full h-px bg-outline-variant relative my-1">
											<span class="material-symbols-outlined absolute -top-[11px] left-1/2 -translate-x-1/2 text-[16px] text-coastal-teal">directions_bus</span>
										</div>
									</div>
									<div class="text-center">
										<p class="font-headline-md text-headline-md font-bold text-deep-navy">{{ r.arrival }}</p>
										<p class="text-xs text-outline truncate max-w-[140px]">{{ r.destinationStop }}</p>
									</div>
								</div>
								<div class="flex flex-col items-start md:items-end gap-1 md:w-56">
									<template v-if="r.price">
										<span class="text-xs text-outline">{{ t("routes.results.zonesLabel") }}: {{ r.zones }}</span>
										<div class="flex flex-wrap gap-1">
											<span v-for="p in r.price.slice(0, 3)" :key="p.id" class="text-xs font-label-md bg-surface-container-low border border-outline-variant/40 rounded px-2 py-1">
												{{ p.name }}: <strong>{{ formatPrice(p.priceCents) }}</strong>
											</span>
										</div>
									</template>
									<a v-else class="text-xs text-outline underline" href="https://www.atmcamptarragona.cat/es/tarifas" target="_blank" rel="noopener noreferrer">{{ t("routes.results.noPrice") }}</a>
								</div>
							</div>
							<details class="border-t border-outline-variant/30 group">
								<summary class="px-5 py-3 cursor-pointer font-label-md text-label-md text-deep-navy flex items-center gap-2 select-none">
									<span class="material-symbols-outlined text-[18px] group-open:rotate-90 transition-transform">chevron_right</span>
									{{ t("routes.results.stopsLabel") }} ({{ r.stops.length }})
								</summary>
								<ol class="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
									<li v-for="(s, si) in r.stops" :key="`${s.town}-${s.stop}-${si}`" class="flex items-baseline gap-3 py-1.5 border-b border-outline-variant/20 last:border-0">
										<span class="font-label-md text-label-md text-deep-navy w-14 shrink-0">{{ s.time }}</span>
										<span class="font-body-md text-body-md text-on-surface">{{ s.town }}</span>
										<span class="text-sm text-on-surface-variant">{{ s.stop }}</span>
									</li>
								</ol>
							</details>
							<div v-if="r.pdfUrl" class="px-5 pb-4">
								<a class="inline-flex items-center gap-2 text-sm text-deep-navy underline" :href="r.pdfUrl" target="_blank" rel="noopener noreferrer">
									<span class="material-symbols-outlined text-[18px]">download</span>
									{{ t("routes.results.downloadPdf") }}
								</a>
							</div>
						</article>
					</div>

					<!-- Transfers -->
					<div v-if="results.transfers.length" class="flex flex-col gap-4">
						<h3 class="font-headline-md text-headline-md text-deep-navy flex items-center gap-2">
							<span class="material-symbols-outlined text-energetic-orange">transfer_within_a_station</span>
							{{ t("routes.results.transfersTitle") }} ({{ results.transfers.length }})
						</h3>
						<article v-for="(tr, ti) in results.transfers" :key="`${tr.transferTown}-${ti}`" class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 ambient-shadow overflow-hidden">
							<div class="p-5 flex flex-col gap-4">
								<div class="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
									<span class="font-label-md text-label-md text-deep-navy">{{ t("routes.results.hubLabel") }}: {{ tr.transferTown }}</span>
									<span>· {{ t("routes.results.waitLabel") }}: {{ tr.waitMin }} min</span>
									<span>· {{ t("routes.results.totalLabel") }}: {{ tr.totalDurationMin }} min</span>
									<span v-if="tr.zones">· {{ t("routes.results.zonesLabel") }}: {{ tr.zones }}</span>
								</div>
								<div v-for="(leg, li) in tr.legs" :key="li" class="flex flex-col md:flex-row md:items-center gap-3 border-l-4 border-coastal-teal pl-4">
									<span class="inline-flex items-center justify-center rounded-lg bg-deep-navy text-on-primary font-label-md text-label-md px-3 py-1.5 min-w-[52px]">{{ lineBadge(leg) }}</span>
									<span class="font-body-md text-body-md text-on-surface-variant md:w-72 line-clamp-1">{{ leg.lineName }}</span>
									<span class="font-headline-md text-headline-md font-bold text-deep-navy">{{ leg.departure }} → {{ leg.arrival }}</span>
									<span class="text-xs text-outline">{{ t("routes.results.hubLabel") }}: {{ leg.originStop }} → {{ leg.destinationStop }}</span>
								</div>
								<div v-if="tr.price" class="flex flex-wrap gap-1">
									<span v-for="p in tr.price.slice(0, 3)" :key="p.id" class="text-xs font-label-md bg-surface-container-low border border-outline-variant/40 rounded px-2 py-1">
										{{ p.name }}: <strong>{{ formatPrice(p.priceCents) }}</strong>
									</span>
								</div>
							</div>
						</article>
					</div>

					<p class="text-xs text-outline italic flex items-center gap-2">
						<span class="material-symbols-outlined text-[16px]">info</span>
						{{ t("routes.results.atmNote") }}
						<a class="underline" href="https://www.atmcamptarragona.cat/es/tarifas" target="_blank" rel="noopener noreferrer">{{ t("routes.results.atmLink") }}</a>
					</p>
				</div>
			</div>
		</section>

		<!-- Most searched lines -->
		<section class="w-full py-16 px-margin-mobile md:px-margin-desktop bg-surface-gray">
			<div class="max-w-container-max mx-auto">
				<div class="mb-10">
					<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-deep-navy mb-2">{{ t("routes.lines.title") }}</h2>
					<p class="font-body-lg text-body-lg text-on-surface-variant">{{ t("routes.lines.subtitle") }}</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
					<div v-for="line in popularCards" :key="line.name" class="bg-surface-container-lowest rounded-xl ambient-shadow border border-outline-variant/20 overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-ambient-lg transition-all duration-300">
						<div class="bg-deep-navy text-on-primary p-4 border-b border-outline-variant/10 flex items-center gap-3">
							<span class="material-symbols-outlined text-secondary-fixed">{{ line.icon }}</span>
							<h3 class="font-headline-md text-headline-md text-[20px] leading-tight">{{ line.name }}</h3>
						</div>
						<div class="p-6 flex-grow flex flex-col justify-between">
							<div class="mb-6">
								<ul class="flex flex-col gap-3">
									<li class="flex items-start gap-3">
										<span class="w-6 h-6 rounded-full bg-surface-bright border-2 border-coastal-teal flex-shrink-0 mt-0.5"></span>
										<span class="font-body-md text-body-md text-on-surface font-medium">{{ line.origin }}</span>
									</li>
									<li class="flex items-start gap-3">
										<span class="w-6 h-6 rounded-full bg-surface-bright border-2 border-energetic-orange flex-shrink-0 mt-0.5"></span>
										<span class="font-body-md text-body-md text-on-surface-variant">{{ line.destination }}</span>
									</li>
								</ul>
							</div>
							<a class="w-full py-3 px-4 rounded border border-outline-variant text-deep-navy font-button text-button flex items-center justify-center gap-2 hover:bg-surface-container-low hover:border-deep-navy transition-all" :href="line.pdfUrl" target="_blank" rel="noopener noreferrer">
								<span class="material-symbols-outlined">download</span>
								{{ t("routes.lines.downloadPdf") }}
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Patinetes banner -->
		<section class="w-full py-12 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest border-t border-outline-variant/20">
			<div class="max-w-4xl mx-auto bg-surface-bright rounded-xl p-6 md:p-8 border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center gap-6">
				<div class="bg-error-container text-on-error-container p-4 rounded-full flex-shrink-0">
					<span class="material-symbols-outlined text-[32px]">electric_scooter</span>
				</div>
				<div>
					<h3 class="font-headline-md text-headline-md text-deep-navy mb-2">{{ t("routes.banner.title") }}</h3>
					<p class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.banner.body") }}</p>
				</div>
			</div>
		</section>
	</div>
</template>
