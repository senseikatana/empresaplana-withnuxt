<script setup lang="ts">
import type { DirectResult, SearchOutput } from "#shared/utils/transit";

const props = defineProps<{ results: SearchOutput; title?: string }>();
const { t } = useI18n();

function formatPrice(cents: number): string {
	return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function lineBadge(result: DirectResult): string {
	if (result.signNumber) return `L${result.signNumber}`;
	return result.lineName.split(" ").slice(0, 4).join(" ");
}
</script>

<template>
	<div class="flex flex-col gap-10">
		<div class="flex flex-col gap-4">
			<h3 class="font-headline-md text-headline-md text-deep-navy flex items-center gap-2">
				<span class="material-symbols-outlined text-coastal-teal">alt_route</span>
				{{ `${props.title ?? t("routes.results.directTitle")} (${props.results.direct.length})` }}
			</h3>

			<p v-if="!props.results.direct.length" class="text-sm text-on-surface-variant bg-surface-container-low rounded-lg border border-outline-variant/30 px-4 py-3">
				{{ t("routes.results.emptyTitle") }}
			</p>

			<article v-for="(r, i) in props.results.direct" :key="`${r.lineId}-${r.departure}-${i}`" class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 ambient-shadow overflow-hidden">
				<div class="flex flex-col md:flex-row md:items-center gap-4 p-5">
					<div class="flex items-center gap-3 md:w-56">
						<span class="inline-flex items-center justify-center rounded-lg bg-primary text-on-primary font-label-md text-label-md px-3 py-1.5 min-w-[52px]">{{ lineBadge(r) }}</span>
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

		<div v-if="props.results.transfers.length" class="flex flex-col gap-4">
			<h3 class="font-headline-md text-headline-md text-deep-navy flex items-center gap-2">
				<span class="material-symbols-outlined text-energetic-orange">transfer_within_a_station</span>
				{{ `${t("routes.results.transfersTitle")} (${props.results.transfers.length})` }}
			</h3>
			<article v-for="(tr, ti) in props.results.transfers" :key="`${tr.transferTown}-${ti}`" class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 ambient-shadow overflow-hidden">
				<div class="p-5 flex flex-col gap-4">
					<div class="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
						<span class="font-label-md text-label-md text-deep-navy">{{ t("routes.results.hubLabel") }}: {{ tr.transferTown }}</span>
						<span>· {{ t("routes.results.waitLabel") }}: {{ tr.waitMin }} min</span>
						<span>· {{ t("routes.results.totalLabel") }}: {{ tr.totalDurationMin }} min</span>
						<span v-if="tr.zones">· {{ t("routes.results.zonesLabel") }}: {{ tr.zones }}</span>
					</div>
					<div v-for="(leg, li) in tr.legs" :key="li" class="flex flex-col md:flex-row md:items-center gap-3 border-l-4 border-coastal-teal pl-4">
						<span class="inline-flex items-center justify-center rounded-lg bg-primary text-on-primary font-label-md text-label-md px-3 py-1.5 min-w-[52px]">{{ lineBadge(leg) }}</span>
						<span class="font-body-md text-body-md text-on-surface-variant md:w-72 line-clamp-1">{{ leg.lineName }}</span>
						<span class="font-headline-md text-headline-md font-bold text-deep-navy">{{ leg.departure }} → {{ leg.arrival }}</span>
						<span class="text-xs text-outline">{{ leg.originStop }} → {{ leg.destinationStop }}</span>
					</div>
					<div v-if="tr.price" class="flex flex-wrap gap-1">
						<span v-for="p in tr.price.slice(0, 3)" :key="p.id" class="text-xs font-label-md bg-surface-container-low border border-outline-variant/40 rounded px-2 py-1">
							{{ p.name }}: <strong>{{ formatPrice(p.priceCents) }}</strong>
						</span>
					</div>
				</div>
			</article>
		</div>
	</div>
</template>
