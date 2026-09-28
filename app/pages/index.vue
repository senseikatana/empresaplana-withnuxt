<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

// meta.title ya incluye la marca; %s evita duplicarla en el titleTemplate
useHead({ title: t("meta.title"), titleTemplate: "%s" });
useSeoMeta({ description: () => t("meta.description") });

const b = computed(() => ({
	tabs: {
		booking: t("homeVariant2.booking.tabs.booking"),
		destination: t("homeVariant2.booking.tabs.destination"),
		passengers: t("homeVariant2.booking.tabs.passengers"),
	},
	origin: t("homeVariant2.booking.origin"),
	destination: t("homeVariant2.booking.destination"),
	date: t("homeVariant2.booking.date"),
	passengers: t("homeVariant2.booking.passengers"),
	originPlaceholder: t("homeVariant2.booking.originPlaceholder"),
	destinationPlaceholder: t("homeVariant2.booking.destinationPlaceholder"),
	datePlaceholder: t("homeVariant2.booking.datePlaceholder"),
	oneAdult: t("homeVariant2.booking.oneAdult"),
	twoAdults: t("homeVariant2.booking.twoAdults"),
	search: t("homeVariant2.booking.search"),
}));

const hs = computed(() => ({
	title: t("homeSearch.title"),
	subtitle: t("homeSearch.subtitle"),
	tabRegular: t("homeSearch.tabRegular"),
	tabTransfers: t("homeSearch.tabTransfers"),
	tripLabel: t("homeSearch.tripLabel"),
	oneWay: t("homeSearch.oneWay"),
	roundTrip: t("homeSearch.roundTrip"),
	returnLabel: t("homeSearch.returnLabel"),
	swapLabel: t("homeSearch.swapLabel"),
}));

const { localities, loadLocalities } = useTransitData();
const origin = ref("");
const destination = ref("");
const travelDate = ref(new Date().toISOString().slice(0, 10));
const returnDate = ref("");
const isRoundTrip = ref(false);
const passengers = ref(1);
const timeRange = ref("");
const timeRanges = useTimeRanges();

onMounted(() => {
	void loadLocalities();
});

function swapPlaces() {
	const tmp = origin.value;
	origin.value = destination.value;
	destination.value = tmp;
}

async function submitSearch() {
	if (!origin.value || !destination.value) return;
	await navigateTo({
		path: localePath("/rutas-horarios"),
		query: {
			from: origin.value,
			to: destination.value,
			...(travelDate.value ? { date: travelDate.value } : {}),
			...(isRoundTrip.value && returnDate.value
				? { return: returnDate.value }
				: {}),
			...(timeRange.value ? { time: timeRange.value } : {}),
		},
	});
}

const r = computed(() => ({
	title: t("homeVariant2.routes.title"),
	startingFrom: t("homeVariant2.routes.startingFrom"),
	price: t("homeVariant2.routes.price"),
	cards: {
		barcelona: {
			name: t("homeVariant2.routes.cards.barcelona.name"),
			desc: t("homeVariant2.routes.cards.barcelona.desc"),
		},
		salou: {
			name: t("homeVariant2.routes.cards.salou.name"),
			desc: t("homeVariant2.routes.cards.salou.desc"),
		},
		tarragona: {
			name: t("homeVariant2.routes.cards.tarragona.name"),
			desc: t("homeVariant2.routes.cards.tarragona.desc"),
		},
	},
}));

const hc = computed(() => ({
	valueProps: {
		title: t("homeContent.valueProps.title"),
		items: [
			{
				icon: "route",
				title: t("homeContent.valueProps.items.routes.title"),
				desc: t("homeContent.valueProps.items.routes.desc"),
			},
			{
				icon: "accessible",
				title: t("homeContent.valueProps.items.accessibility.title"),
				desc: t("homeContent.valueProps.items.accessibility.desc"),
			},
			{
				icon: "directions_bus",
				title: t("homeContent.valueProps.items.fleet.title"),
				desc: t("homeContent.valueProps.items.fleet.desc"),
			},
			{
				icon: "support_agent",
				title: t("homeContent.valueProps.items.personalized.title"),
				desc: t("homeContent.valueProps.items.personalized.desc"),
			},
		],
	},
	airportPromo: {
		tag: t("homeContent.airportPromo.tag"),
		title: t("homeContent.airportPromo.title"),
		subtitle: t("homeContent.airportPromo.subtitle"),
		cta: t("homeContent.airportPromo.cta"),
	},
	coachRental: {
		title: t("homeContent.coachRental.title"),
		subtitle: t("homeContent.coachRental.subtitle"),
		quoteCta: t("homeContent.coachRental.quoteCta"),
	},
	fundedBy: {
		title: t("about.fundedBy"),
		items: [
			t("homeContent.fundedBy.items.0"),
			t("homeContent.fundedBy.items.1"),
			t("homeContent.fundedBy.items.2"),
		],
	},
}));

const rentalPhones = computed(() => [
	{
		icon: "location_city",
		area: t("discretionary.cta.areaTarragona"),
		phone: t("discretionary.cta.phoneTarragona"),
	},
	{
		icon: "apartment",
		area: t("discretionary.cta.areaBarcelona"),
		phone: t("discretionary.cta.phoneBarcelona"),
	},
]);

const routes = computed(() => [
	{
		name: r.value.cards.barcelona.name,
		desc: r.value.cards.barcelona.desc,
		image: "card-barcelona",
	},
	{
		name: r.value.cards.salou.name,
		desc: r.value.cards.salou.desc,
		image: "card-salou",
	},
	{
		name: r.value.cards.tarragona.name,
		desc: r.value.cards.tarragona.desc,
		image: "card-tarragona",
	},
]);
</script>

<template>
	<!-- Hero + Search -->
	<section class="relative w-full min-h-[600px] md:min-h-[660px] flex flex-col justify-end overflow-hidden">
		<AppPicture
			name="hero-home"
			alt=""
			class="absolute inset-0 block"
			img-class="absolute inset-0 w-full h-full object-cover"
			loading="eager"
			fetchpriority="high"
		/>
		<div class="absolute inset-0 bg-gradient-to-b from-deep-navy/80 via-deep-navy/40 to-deep-navy/85" aria-hidden="true" />

		<div class="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-20 pb-6 text-center">
			<span class="material-symbols-outlined text-secondary-fixed text-[40px] mb-2">directions_bus</span>
			<h1 class="font-display-lg text-display-lg md:text-[56px] leading-tight font-bold text-on-primary drop-shadow-md">{{ hs.title }}</h1>
			<p class="font-body-lg text-body-lg text-on-primary/90 mt-3 max-w-2xl mx-auto">{{ hs.subtitle }}</p>
		</div>

		<div class="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-12">
			<div class="bg-surface-container-lowest rounded-lg shadow-ambient-lg border border-outline-variant/30">
				<div class="flex items-center gap-1 px-2 border-b border-outline-variant/40">
					<button type="button" class="flex items-center gap-2 px-4 py-3 font-label-md text-label-md text-deep-navy border-b-2 border-coastal-teal">
						<span class="material-symbols-outlined text-[18px]">directions_bus</span>
						{{ hs.tabRegular }}
					</button>
					<a class="flex items-center gap-2 px-4 py-3 font-label-md text-label-md text-on-surface-variant hover:text-deep-navy transition-colors" href="https://www.busplana.com/" target="_blank" rel="noopener noreferrer">
						<span class="material-symbols-outlined text-[18px]">flight_takeoff</span>
						{{ hs.tabTransfers }}
					</a>
				</div>

				<form class="flex flex-col md:flex-row md:items-stretch" @submit.prevent="submitSearch">
					<div class="relative flex-1 border-b md:border-b-0 md:border-r border-outline-variant/40 px-4 py-3">
						<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="home-origin">{{ b.origin }}</label>
						<select id="home-origin" v-model="origin" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
							<option value="" disabled>{{ b.originPlaceholder }}</option>
							<option v-for="town in localities" :key="town" :value="town">{{ town }}</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
						<button
							type="button"
							class="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm items-center justify-center hover:bg-surface-container-low transition-colors"
							:aria-label="hs.swapLabel"
							:title="hs.swapLabel"
							@click="swapPlaces"
						>
							<span class="material-symbols-outlined text-[18px] text-deep-navy">swap_horiz</span>
						</button>
					</div>
					<div class="relative flex-1 border-b md:border-b-0 md:border-r border-outline-variant/40 px-4 py-3">
						<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="home-destination">{{ b.destination }}</label>
						<select id="home-destination" v-model="destination" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
							<option value="" disabled>{{ b.destinationPlaceholder }}</option>
							<option v-for="town in localities" :key="town" :value="town">{{ town }}</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
					</div>
					<div class="px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-48">
						<span class="block text-[11px] uppercase tracking-wider text-outline mb-1">{{ hs.tripLabel }}</span>
						<div class="flex items-center gap-3 pt-1.5">
							<label class="flex items-center gap-1.5 cursor-pointer text-sm text-on-surface">
								<input v-model="isRoundTrip" type="radio" :value="false" class="accent-teal-600" />
								{{ hs.oneWay }}
							</label>
							<label class="flex items-center gap-1.5 cursor-pointer text-sm text-on-surface">
								<input v-model="isRoundTrip" type="radio" :value="true" class="accent-teal-600" />
								{{ hs.roundTrip }}
							</label>
						</div>
					</div>
					<div class="px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-40">
						<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="home-date">{{ b.date }}</label>
						<input id="home-date" v-model="travelDate" type="date" class="w-full bg-transparent font-body-md text-body-md text-on-surface outline-none" />
					</div>
					<div v-if="isRoundTrip" class="px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-40">
						<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="home-return">{{ hs.returnLabel }}</label>
						<input id="home-return" v-model="returnDate" type="date" class="w-full bg-transparent font-body-md text-body-md text-on-surface outline-none" />
					</div>
					<div class="relative px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-40">
						<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="home-time">{{ t("routes.search.timeLabel") }}</label>
						<select id="home-time" v-model="timeRange" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
							<option v-for="r in timeRanges" :key="r.value" :value="r.value">{{ r.label }}</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
					</div>
					<div class="relative px-4 py-3 border-b md:border-b-0 md:border-r border-outline-variant/40 md:w-32">
						<label class="block text-[11px] uppercase tracking-wider text-outline mb-1" for="home-passengers">{{ b.passengers }}</label>
						<select id="home-passengers" v-model.number="passengers" class="w-full appearance-none bg-transparent font-body-md text-body-md text-on-surface outline-none pr-6 cursor-pointer">
							<option v-for="n in 8" :key="n" :value="n">{{ n }}</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 bottom-3 text-outline pointer-events-none text-[20px]">expand_more</span>
					</div>
					<button
						type="submit"
						:disabled="!origin || !destination"
						class="bg-deep-navy text-on-primary font-button text-button uppercase tracking-wide px-8 py-4 md:py-0 min-h-[56px] hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{{ b.search }}
					</button>
				</form>
			</div>
		</div>
	</section>

	<!-- Popular Routes Section -->
	<section class="max-w-container-max mx-auto md:px-margin-desktop px-margin-mobile py-stack-lg">
		<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy mb-8 uppercase tracking-wide">{{ r.title }}</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-gutter">
			<div
				v-for="route in routes"
				:key="route.name"
				class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-ambient hover:shadow-ambient-lg border border-surface-variant flex flex-col group hover:-translate-y-1 transition-all duration-300"
			>
				<div class="h-48 relative overflow-hidden">
					<AppPicture :name="route.image" :alt="route.name" img-class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
				</div>
				<div class="p-6 flex flex-col flex-grow">
					<h3 class="font-headline-md text-headline-md font-bold text-on-surface mb-2">{{ route.name }}</h3>
					<p class="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-3">{{ route.desc }}</p>
					<div class="mt-auto flex justify-between items-end border-t border-surface-variant pt-4">
						<span class="font-label-md text-label-md text-outline">{{ r.startingFrom }}</span>
						<span class="font-headline-md text-headline-md font-bold text-deep-navy">{{ r.price }}</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Value Props Section -->
	<section class="bg-surface-gray w-full">
		<div class="max-w-container-max mx-auto md:px-margin-desktop px-margin-mobile py-stack-lg md:py-20">
			<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy mb-10 text-center uppercase tracking-wide">{{ hc.valueProps.title }}</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
				<div
					v-for="item in hc.valueProps.items"
					:key="item.icon"
					class="bg-surface-container-lowest rounded-xl shadow-ambient border border-surface-variant p-6 flex flex-col items-start gap-4"
				>
					<div class="w-12 h-12 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center">
						<span class="material-symbols-outlined icon-filled">{{ item.icon }}</span>
					</div>
					<h3 class="font-label-md text-label-md uppercase tracking-wide text-deep-navy">{{ item.title }}</h3>
					<p class="font-body-md text-body-md text-on-surface-variant">{{ item.desc }}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Airport Transfer Promo -->
	<section class="w-full bg-deep-navy text-on-primary relative overflow-hidden">
		<div class="absolute top-0 right-0 w-64 h-64 bg-surface-tint rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
		<div class="max-w-container-max mx-auto md:px-margin-desktop px-margin-mobile py-stack-lg md:py-16 relative flex flex-col md:flex-row items-start md:items-center justify-between gap-stack-lg">
			<div class="flex items-start gap-5">
				<div class="w-14 h-14 rounded-full bg-on-primary/10 border border-on-primary/20 flex items-center justify-center flex-shrink-0">
					<span class="material-symbols-outlined text-secondary-fixed text-[28px]">flight_takeoff</span>
				</div>
				<div>
					<p class="font-label-md text-label-md uppercase tracking-widest text-secondary-fixed mb-2">{{ hc.airportPromo.tag }}</p>
					<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold mb-2">{{ hc.airportPromo.title }}</h2>
					<p class="font-body-md text-body-md text-on-primary/80 max-w-xl">{{ hc.airportPromo.subtitle }}</p>
				</div>
			</div>
			<a
				class="inline-flex items-center justify-center gap-2 bg-energetic-orange text-on-primary font-button text-button px-8 py-4 rounded min-h-[48px] hover:opacity-90 transition-opacity flex-shrink-0"
				href="https://www.busplana.com/"
				target="_blank"
				rel="noopener noreferrer"
			>
				{{ hc.airportPromo.cta }}
				<span class="material-symbols-outlined text-[20px]">arrow_forward</span>
			</a>
		</div>
	</section>

	<!-- Coach Rental Section -->
	<section class="max-w-container-max mx-auto md:px-margin-desktop px-margin-mobile py-stack-lg md:py-20">
		<div class="bg-surface-container-lowest rounded-xl shadow-ambient border border-surface-variant overflow-hidden flex flex-col lg:flex-row">
			<div class="lg:w-1/2 p-8 md:p-12 flex flex-col justify-center gap-5">
				<div class="w-12 h-12 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center">
					<span class="material-symbols-outlined icon-filled">event_seat</span>
				</div>
				<h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-deep-navy">{{ hc.coachRental.title }}</h2>
				<p class="font-body-lg text-body-lg text-on-surface-variant">{{ hc.coachRental.subtitle }}</p>
				<a
					class="inline-flex items-center justify-center gap-2 self-start bg-energetic-orange text-on-primary font-button text-button px-8 py-4 rounded min-h-[48px] hover:opacity-90 transition-opacity"
					:href="localePath('/solicitar-presupuesto')"
				>
					{{ hc.coachRental.quoteCta }}
					<span class="material-symbols-outlined text-[20px]">arrow_forward</span>
				</a>
			</div>
			<div class="lg:w-1/2 bg-surface-gray p-8 md:p-12 flex flex-col justify-center gap-4">
				<div
					v-for="item in rentalPhones"
					:key="item.phone"
					class="bg-surface-container-lowest rounded-lg border border-surface-variant p-6 flex items-center gap-4 shadow-sm"
				>
					<div class="w-11 h-11 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center flex-shrink-0">
						<span class="material-symbols-outlined">{{ item.icon }}</span>
					</div>
					<div>
						<p class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{{ item.area }}</p>
						<a class="font-headline-md text-headline-md font-bold text-deep-navy hover:text-coastal-teal transition-colors" :href="`tel:${item.phone.replace(/\s/g, '')}`">{{ item.phone }}</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Funded by strip -->
	<section class="w-full border-t border-surface-variant bg-surface-container-lowest">
		<div class="max-w-container-max mx-auto md:px-margin-desktop px-margin-mobile py-stack-md flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
			<span class="font-label-md text-label-md uppercase tracking-widest text-outline">{{ hc.fundedBy.title }}</span>
			<div class="flex flex-wrap justify-center gap-3">
				<span
					v-for="(item, i) in hc.fundedBy.items"
					:key="i"
					class="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 font-label-md text-label-md text-on-surface-variant"
				>
					<span class="material-symbols-outlined text-[16px] text-coastal-teal">verified</span>
					{{ item }}
				</span>
			</div>
		</div>
	</section>
</template>