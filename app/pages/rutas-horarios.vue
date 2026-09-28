<script setup lang="ts">
import type { SearchOutput } from "#shared/utils/transit";
import popularLines from "~/data/popular-lines.json";

const { locale, t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();

useHead({ title: () => t("routes.title") });
useSeoMeta({ description: () => t("routes.hero.subtitle") });

const { localities, loadLocalities } = useTransitData();
const { search } = useTransitSearch();
const timeRanges = useTimeRanges();

const origin = ref("");
const destination = ref("");
const travelDate = ref("");
const returnDate = ref("");
const timeRange = ref("");
const searchType = ref<"direct" | "transfer">("direct");

const isRoundTrip = ref(false);

// El radio es la fuente de verdad: derivarlo de returnDate hacía que elegir
// "ida y vuelta" sin fecha de ida rebotase a "ida" (setter guardaba "").
watch(isRoundTrip, (value) => {
	returnDate.value = value ? returnDate.value || travelDate.value : "";
});

// Si se elige ida y vuelta antes de la fecha de ida, se propone la misma.
watch(travelDate, (value) => {
	if (isRoundTrip.value && !returnDate.value) returnDate.value = value;
});

const outbound = ref<SearchOutput | null>(null);
const inbound = ref<SearchOutput | null>(null);
const searching = ref(false);
const searched = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
	applyQuery();
	try {
		await loadLocalities();
	} catch {
		// dataset unavailable; the search will fall back to the API in non-demo builds
	}
	if (origin.value && destination.value) {
		await runSearch();
	}
});

function applyQuery() {
	if (route.query.from) origin.value = String(route.query.from);
	if (route.query.to) destination.value = String(route.query.to);
	if (route.query.date) travelDate.value = String(route.query.date);
	if (route.query.return) {
		returnDate.value = String(route.query.return);
		isRoundTrip.value = true;
	}
	if (route.query.time) timeRange.value = String(route.query.time);
	searchType.value = route.query.type === "transfer" ? "transfer" : "direct";
}

function swapPlaces() {
	const tmp = origin.value;
	origin.value = destination.value;
	destination.value = tmp;
}

async function runSearch() {
	error.value = null;
	searched.value = true;
	if (!origin.value.trim() || !destination.value.trim()) {
		error.value = t("routes.results.missingSelection");
		return;
	}
	searching.value = true;
	outbound.value = null;
	inbound.value = null;
	try {
		await navigateTo(
			{
				query: {
					from: origin.value,
					to: destination.value,
					...(travelDate.value ? { date: travelDate.value } : {}),
					...(isRoundTrip.value && returnDate.value
						? { return: returnDate.value }
						: {}),
					...(timeRange.value ? { time: timeRange.value } : {}),
					...(searchType.value === "transfer" ? { type: "transfer" } : {}),
				},
			},
			{ replace: true },
		);
		const params = {
			from: origin.value,
			to: destination.value,
			time: timeRange.value || null,
			date: travelDate.value || null,
			type: searchType.value,
		};
		outbound.value = await search(params);
		if (isRoundTrip.value && returnDate.value) {
			inbound.value = await search({
				from: destination.value,
				to: origin.value,
				time: timeRange.value || null,
				date: returnDate.value || null,
				type: searchType.value,
			});
		}
	} catch {
		error.value = t("routes.results.databaseError");
	} finally {
		searching.value = false;
	}
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
		<section class="relative w-full py-12 md:py-16 px-margin-mobile md:px-margin-desktop bg-surface-container-low border-b border-outline-variant/30">
			<div class="w-full max-w-container-max mx-auto flex flex-col gap-stack-lg">
				<div class="text-center max-w-3xl mx-auto">
					<h1 class="font-display-lg text-display-lg md:text-[56px] leading-tight mb-4 text-deep-navy">{{ t("routes.hero.title") }}</h1>
					<p class="font-body-lg text-body-lg text-on-surface-variant">{{ t("routes.hero.subtitle") }}</p>
				</div>

				<div class="w-full max-w-5xl xl:max-w-6xl mx-auto bg-surface-container-lowest rounded-lg shadow-ambient-lg border border-outline-variant/30">
					<form class="flex flex-col md:flex-row md:items-stretch" @submit.prevent="runSearch">
						<div class="relative flex-1 border-b md:border-b-0 md:border-r border-outline-variant/40 px-4 py-3">
							<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="route-origin">{{ t("routes.search.originLabel") }}</label>
							<select id="route-origin" v-model="origin" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
								<option value="" disabled>{{ t("routes.search.originPlaceholder") }}</option>
								<option v-for="town in localities" :key="town" :value="town">{{ town }}</option>
							</select>
							<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
							<button
								type="button"
								class="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm items-center justify-center hover:bg-surface-container-low transition-colors"
								:aria-label="t('homeSearch.swapLabel')"
								:title="t('homeSearch.swapLabel')"
								@click="swapPlaces"
							>
								<span class="material-symbols-outlined text-[18px] text-deep-navy">swap_horiz</span>
							</button>
						</div>
						<div class="relative flex-1 border-b md:border-b-0 md:border-r border-outline-variant/40 px-4 py-3">
							<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="route-destination">{{ t("routes.search.destinationLabel") }}</label>
							<select id="route-destination" v-model="destination" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
								<option value="" disabled>{{ t("routes.search.destinationPlaceholder") }}</option>
								<option v-for="town in localities" :key="town" :value="town">{{ town }}</option>
							</select>
							<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
						</div>
						<div class="px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-48">
							<span class="block text-[11px] uppercase tracking-wider text-outline mb-1">{{ t("homeSearch.tripLabel") }}</span>
							<div class="flex items-center gap-3 pt-1.5">
								<label class="flex items-center gap-1.5 cursor-pointer text-sm text-on-surface">
									<input v-model="isRoundTrip" type="radio" name="trip-type" :value="false" class="accent-teal-600" />
									{{ t("homeSearch.oneWay") }}
								</label>
								<label class="flex items-center gap-1.5 cursor-pointer text-sm text-on-surface">
									<input v-model="isRoundTrip" type="radio" name="trip-type" :value="true" class="accent-teal-600" />
									{{ t("homeSearch.roundTrip") }}
								</label>
							</div>
						</div>
						<div class="px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-40">
							<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="route-date">{{ t("routes.search.dateLabel") }}</label>
							<input id="route-date" v-model="travelDate" type="date" class="w-full bg-transparent font-body-md text-body-md text-on-surface outline-none" />
						</div>
						<div v-if="isRoundTrip" class="px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-40">
							<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="route-return">{{ t("homeSearch.returnLabel") }}</label>
							<input id="route-return" v-model="returnDate" type="date" class="w-full bg-transparent font-body-md text-body-md text-on-surface outline-none" />
						</div>
						<div class="relative px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-40">
							<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="route-time">{{ t("routes.search.timeLabel") }}</label>
							<select id="route-time" v-model="timeRange" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
								<option v-for="r in timeRanges" :key="r.value" :value="r.value">{{ r.label }}</option>
							</select>
							<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
						</div>
						<button
							type="submit"
							:disabled="!origin || !destination || searching"
							class="bg-primary text-on-primary font-button text-button uppercase tracking-wide px-8 py-4 md:py-0 min-h-[56px] hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{{ t("routes.search.submit") }}
						</button>
					</form>
				</div>

				<div class="w-full max-w-5xl xl:max-w-6xl mx-auto flex flex-wrap items-center gap-6 justify-center md:justify-start">
					<div class="flex items-center gap-6">
						<label class="flex items-center gap-2 cursor-pointer">
							<input v-model="searchType" type="radio" name="search-type" value="direct" class="w-4 h-4 text-coastal-teal" />
							<span class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.search.direct") }}</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input v-model="searchType" type="radio" name="search-type" value="transfer" class="w-4 h-4 text-coastal-teal" />
							<span class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.search.withTransfers") }}</span>
						</label>
					</div>
					<p class="text-xs text-outline italic">{{ t("routes.search.disclaimer") }}</p>
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
					<span v-if="outbound" class="text-sm text-outline">· {{ t("routes.results.resultsCount", { count: outbound.direct.length }) }}</span>
				</p>

				<UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-8" />

				<div v-else-if="searching" class="py-12 text-center text-on-surface-variant">
					<span class="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
					<p class="mt-3">{{ t("routes.results.searchingInfo") }}</p>
				</div>

				<div v-else-if="outbound && !outbound.direct.length && !outbound.transfers.length && !inbound" class="bg-surface-container-low rounded-xl p-10 text-center border border-outline-variant/30">
					<span class="material-symbols-outlined text-[40px] text-outline">search_off</span>
					<h3 class="font-headline-md text-headline-md text-deep-navy mt-3">{{ t("routes.results.emptyTitle") }}</h3>
					<p class="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl mx-auto">{{ t("routes.results.emptyBody") }}</p>
					<p class="font-body-md text-body-md text-on-surface-variant">{{ t("routes.results.emptyHint") }}</p>
				</div>

				<div v-else-if="outbound" class="flex flex-col gap-14">
					<TransitResults :results="outbound" />
					<div v-if="inbound" class="border-t border-outline-variant/30 pt-10">
						<TransitResults :results="inbound" :title="t('homeSearch.returnLabel')" />
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
						<div class="bg-primary text-on-primary p-4 border-b border-outline-variant/10 flex items-center gap-3">
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
