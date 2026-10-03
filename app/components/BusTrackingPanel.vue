<script setup lang="ts">
import type {
	LineStats,
	ReportAction,
	ReportResult,
} from "#shared/types/bus-tracking";

/**
 * Panel de bus tracking (reportes de puntualidad + valoración del viaje).
 * Puerto del `BusTrackingPanel.tsx` de `empresaplana-withastro` (React → Vue),
 * usando el diccionario `busTracking.*` que ya existía traducido en los
 * tres idiomas.
 */

interface StopInfo {
	id: string;
	name: string;
	time: string;
}

const props = defineProps<{
	lineId: string;
	lineLabel: string;
	stops: StopInfo[];
}>();

const { t } = useI18n();

const ACTIONS: { value: ReportAction; icon: string }[] = [
	{ value: "passed", icon: "check_circle" },
	{ value: "onTime", icon: "schedule" },
	{ value: "late", icon: "schedule" },
	{ value: "early", icon: "schedule" },
	{ value: "notPassed", icon: "cancel" },
	{ value: "cancelled", icon: "block" },
];

const ACTION_STYLES: Record<ReportAction, string> = {
	passed:
		"border-deep-navy/30 text-deep-navy hover:bg-deep-navy hover:text-on-primary",
	onTime:
		"border-coastal-teal/40 text-on-secondary-container hover:bg-secondary-container",
	late: "border-error/30 text-error hover:bg-error hover:text-on-error",
	early:
		"border-on-tertiary-container/40 text-on-tertiary-container hover:bg-tertiary-container",
	notPassed: "border-error/30 text-error hover:bg-error hover:text-on-error",
	cancelled:
		"border-outline text-on-surface-variant hover:bg-surface-container-high",
};

const stopId = ref(props.stops[0]?.id ?? "");
const action = ref<ReportAction | null>(null);
const minutesLate = ref("");
const comment = ref("");
const submitting = ref(false);
const error = ref<string | null>(null);
const result = ref<ReportResult | null>(null);
const stats = ref<LineStats | null>(null);

const stars = ref(0);
const reviewComment = ref("");
const reviewSubmitting = ref(false);
const reviewSubmitted = ref(false);

const selectedStop = computed(
	() => props.stops.find((s) => s.id === stopId.value) ?? props.stops[0],
);

const negativeCount = computed(() => stats.value?.negative ?? 0);
const threshold = computed(() => stats.value?.threshold ?? 3);
const escalated = computed(() =>
	Boolean(stats.value?.escalated || result.value?.escalation),
);
const progressWidth = computed(() =>
	Math.min(100, (negativeCount.value / threshold.value) * 100),
);
const strikesLeft = computed(() =>
	Math.max(0, threshold.value - negativeCount.value),
);

onMounted(async () => {
	try {
		const data = await $fetch<{ stats: LineStats | null }>(
			`/api/bus-tracking/reports?lineId=${encodeURIComponent(props.lineId)}`,
		);
		if (data.stats) stats.value = data.stats;
	} catch {
		// Sin stats también se puede reportar: no es un error bloqueante.
	}
});

function toggleAction(value: ReportAction) {
	action.value = action.value === value ? null : value;
	error.value = null;
}

async function submitReport() {
	if (!action.value) {
		error.value = t("busTracking.feedback.selectIssue");
		return;
	}
	submitting.value = true;
	error.value = null;
	try {
		const data = await $fetch<ReportResult>("/api/bus-tracking/reports", {
			method: "POST",
			body: {
				lineId: props.lineId,
				stopId: selectedStop.value?.id,
				action: action.value,
				minutesLate: minutesLate.value ? Number(minutesLate.value) : undefined,
				comment: comment.value || undefined,
			},
		});
		result.value = data;
		stats.value = data.stats;
		action.value = null;
		minutesLate.value = "";
		comment.value = "";
	} catch {
		error.value = t("busTracking.feedback.error");
	} finally {
		submitting.value = false;
	}
}

async function submitReview() {
	if (stars.value < 1) return;
	reviewSubmitting.value = true;
	try {
		await $fetch("/api/bus-tracking/reviews", {
			method: "POST",
			body: {
				lineId: props.lineId,
				stars: stars.value,
				comment: reviewComment.value || undefined,
			},
		});
		reviewSubmitted.value = true;
		stars.value = 0;
		reviewComment.value = "";
	} catch {
		error.value = t("busTracking.feedback.error");
	} finally {
		reviewSubmitting.value = false;
	}
}
</script>

<template>
	<div class="max-w-2xl mx-auto space-y-stack-lg">
		<section
			class="bg-surface-container-lowest rounded-xl border border-outline-variant/20 ambient-shadow p-6"
		>
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-deep-navy"
					>directions_bus</span
				>
				<h2 class="font-headline-md text-headline-md text-deep-navy">
					{{ t("busTracking.title") }}
				</h2>
			</div>
			<p class="font-body-md text-body-md text-on-surface-variant mb-6">
				{{ t("busTracking.subtitle") }}
			</p>

			<div class="flex flex-col md:flex-row gap-stack-md mb-6">
				<div class="flex-1">
					<span
						class="font-label-md text-label-md text-on-surface-variant uppercase"
						>{{ t("busTracking.line") }}</span
					>
					<p class="font-headline-md text-headline-md text-on-surface">
						{{ lineLabel }}
					</p>
				</div>
				<div class="flex-1">
					<span
						class="font-label-md text-label-md text-on-surface-variant uppercase"
						>{{ t("busTracking.stop") }}</span
					>
					<select
						v-model="stopId"
						class="w-full mt-1 px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal"
					>
						<option v-for="stop in stops" :key="stop.id" :value="stop.id">
							{{ stop.name }} — {{ t("busTracking.scheduled") }}
							{{ stop.time }}
						</option>
					</select>
				</div>
			</div>

			<p class="font-label-md text-label-md text-on-surface-variant mb-3">
				{{ t("busTracking.feedback.selectIssue") }}
			</p>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
				<button
					v-for="{ value, icon } in ACTIONS"
					:key="value"
					type="button"
					class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-label-md transition-colors"
					:class="
						action === value
							? 'bg-deep-navy text-on-primary border-deep-navy'
							: ACTION_STYLES[value]
					"
					@click="toggleAction(value)"
				>
					<span class="material-symbols-outlined text-[18px]">{{ icon }}</span>
					{{ t(`busTracking.actions.${value}`) }}
				</button>
			</div>

			<div v-if="action === 'late' || action === 'early'" class="mt-4">
				<label
					class="font-label-md text-label-md text-on-surface-variant"
					for="minutes-late"
					>{{ t("busTracking.feedback.minutesLate") }}</label
				>
				<input
					id="minutes-late"
					v-model="minutesLate"
					type="number"
					min="0"
					class="mt-1 w-full md:w-40 px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal"
				/>
			</div>

			<div class="mt-4">
				<label
					class="font-label-md text-label-md text-on-surface-variant"
					for="report-comment"
					>{{ t("busTracking.feedback.comment") }}</label
				>
				<textarea
					id="report-comment"
					v-model="comment"
					rows="2"
					:placeholder="t('busTracking.feedback.commentPlaceholder')"
					class="mt-1 w-full px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal"
				/>
			</div>

			<p v-if="error" class="mt-3 text-error font-body-md text-body-md">
				{{ error }}
			</p>

			<button
				type="button"
				:disabled="submitting"
				class="mt-4 w-full md:w-auto bg-energetic-orange text-white font-button text-button px-8 py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
				@click="submitReport"
			>
				{{ submitting ? "…" : t("busTracking.feedback.send") }}
			</button>

			<div
				v-if="result"
				class="mt-4 p-4 rounded-lg bg-secondary-container/30 border border-coastal-teal/30"
			>
				<p class="font-headline-md text-headline-md text-on-secondary-container">
					{{ t("busTracking.feedback.thanks") }}
				</p>
				<p class="font-body-md text-body-md text-on-surface-variant">
					{{ t("busTracking.feedback.thanksDesc") }}
				</p>
			</div>

			<div v-if="stats" class="mt-6 border-t border-outline-variant/30 pt-4">
				<div class="flex items-center justify-between mb-2">
					<span class="font-label-md text-label-md text-on-surface-variant">
						{{ t("busTracking.stats.punctuality") }} ·
						{{ t("busTracking.stats.onTimeRate") }}: {{ stats.onTimeRate }}%
					</span>
					<span class="font-label-md text-label-md text-deep-navy">
						{{ negativeCount }}/{{ threshold }}
					</span>
				</div>
				<div class="h-2 rounded-full bg-surface-container overflow-hidden">
					<div
						class="h-full rounded-full transition-all"
						:style="{
							width: `${progressWidth}%`,
							backgroundColor: escalated ? '#ba1a1a' : '#EB8E02',
						}"
					/>
				</div>
				<p class="mt-2 font-body-md text-body-md text-on-surface-variant">
					{{
						escalated
							? t("busTracking.alerts.notifiedBody")
							: `${t("busTracking.alerts.strikesLeft")}: ${strikesLeft}`
					}}
				</p>
				<div
					v-if="escalated"
					class="mt-3 p-4 rounded-lg bg-error-container/60 border border-error/30"
				>
					<p class="font-headline-md text-headline-md text-on-error-container">
						{{ t("busTracking.alerts.notifiedTitle") }}
					</p>
					<ul
						class="mt-2 space-y-1 font-body-md text-body-md text-on-error-container"
					>
						<li>· {{ t("busTracking.alerts.coordinatorNotified") }}</li>
						<li>· {{ t("busTracking.alerts.companyNotified") }}</li>
					</ul>
				</div>
			</div>
		</section>

		<section
			class="bg-surface-container-lowest rounded-xl border border-outline-variant/20 ambient-shadow p-6"
		>
			<div class="flex items-center gap-3 mb-2">
				<span class="material-symbols-outlined text-deep-navy">star</span>
				<h2 class="font-headline-md text-headline-md text-deep-navy">
					{{ t("busTracking.review.title") }}
				</h2>
			</div>
			<p class="font-body-md text-body-md text-on-surface-variant mb-6">
				{{ t("busTracking.review.subtitle") }}
			</p>

			<div class="flex items-center gap-1 mb-4">
				<button
					v-for="value in 5"
					:key="value"
					type="button"
					:aria-label="`${value} ${t('busTracking.review.stars')}`"
					class="p-1 text-energetic-orange hover:scale-110 transition-transform"
					@click="stars = value"
				>
					<span class="material-symbols-outlined text-[28px]">{{
						value <= stars ? "star" : "star_outline"
					}}</span>
				</button>
			</div>

			<textarea
				v-model="reviewComment"
				rows="2"
				:placeholder="t('busTracking.feedback.commentPlaceholder')"
				class="w-full px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest focus:border-coastal-teal focus:ring-1 focus:ring-coastal-teal"
			/>

			<button
				type="button"
				:disabled="stars < 1 || reviewSubmitting"
				class="mt-4 w-full md:w-auto bg-deep-navy text-white font-button text-button px-8 py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
				@click="submitReview"
			>
				{{ t("busTracking.review.submit") }}
			</button>

			<p
				v-if="reviewSubmitted"
				class="mt-4 font-body-md text-body-md text-on-secondary-container bg-secondary-container/30 border border-coastal-teal/30 rounded-lg p-4"
			>
				{{ t("busTracking.review.thanks") }}
			</p>
		</section>
	</div>
</template>
