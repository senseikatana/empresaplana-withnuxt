<script setup lang="ts">
import {
	ArcElement,
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	DoughnutController,
	Filler,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Tooltip,
} from "chart.js";

/**
 * Envoltorio de Chart.js, solo en cliente (Chart.js necesita DOM y toca
 * `window`, así que SSR lo rompería → el componente va con `<ClientOnly>`).
 *
 * Los colores se leen de los tokens del proyecto (`--color-*`) en vez de
 * hardcodearlos, para que las gráficas sigan el modo claro/oscuro y la marca.
 */

Chart.register(
	LineController,
	BarController,
	DoughnutController,
	ArcElement,
	BarElement,
	LineElement,
	PointElement,
	Filler,
	Legend,
	Tooltip,
	CategoryScale,
	LinearScale,
);

const props = withDefaults(
	defineProps<{
		type: "doughnut" | "bar" | "line";
		labels: string[];
		data: number[];
		/** Tokens de color (nombres de custom property de Tailwind). */
		colorTokens?: string[];
		height?: number;
		/** Formato del tooltip, p. ej. "{n} rutas". */
		tooltipSuffix?: string;
	}>(),
	{ height: 240 },
);

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

function token(name: string, fallback: string): string {
	if (typeof window === "undefined") return fallback;
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return value || fallback;
}

/** Reparto por defecto cuando solo hay una serie. */
const DEFAULT_TOKENS = [
	"--color-coastal-teal",
	"--color-energetic-orange",
	"--color-deep-navy",
	"--color-outline",
	"--color-inverse-primary",
];

function colors(): string[] {
	const tokens = props.colorTokens?.length ? props.colorTokens : DEFAULT_TOKENS;
	return tokens.map((t) => token(t, "#013990"));
}

function build() {
	if (!canvas.value) return;
	chart?.destroy();

	const isPie = props.type === "doughnut";
	const palette = colors();

	chart = new Chart(canvas.value, {
		type: props.type,
		data: {
			labels: props.labels,
			datasets: [
				{
					data: props.data,
					backgroundColor: isPie
						? palette
						: props.type === "bar"
							? palette.map((c) => `${c}cc`)
							: `${palette[0]}33`,
					borderColor: isPie ? "transparent" : palette[0],
					borderWidth: isPie ? 0 : 2,
					borderRadius: props.type === "bar" ? 8 : 0,
					barThickness: props.type === "bar" ? 22 : undefined,
					fill: props.type === "line",
					tension: 0.4,
					pointRadius: props.type === "line" ? 3 : undefined,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					// Solo el doughnut: sus etiquetas van en la leyenda. En bar/line
					// el eje X ya nombra las categorías, y como el dataset no lleva
					// `label` Chart.js pintaba "undefined" en la leyenda.
					display: isPie,
					position: "bottom" as const,
					align: "center" as const,
					labels: {
						usePointStyle: true,
						pointStyle: "circle",
						padding: 14,
						font: { size: 12 },
						color: token("--color-on-surface-variant", "#434652"),
					},
				},
				tooltip: {
					callbacks: {
						label: (ctx) => {
							const value = ctx.parsed?.y ?? ctx.parsed ?? ctx.raw;
							return props.tooltipSuffix
								? `${String(ctx.label ?? "")}: ${String(value)} ${props.tooltipSuffix}`
								: `${String(ctx.label ?? "")}: ${String(value)}`;
						},
					},
				},
			},
			...(isPie
				? { cutout: "68%" }
				: {
						scales: {
							x: {
								grid: { display: false },
								ticks: {
									color: token("--color-outline", "#747783"),
									font: { size: 11 },
								},
							},
							y: {
								beginAtZero: true,
								grid: { color: "rgba(127,127,127,0.12)" },
								ticks: {
									precision: 0,
									color: token("--color-outline", "#747783"),
									font: { size: 11 },
								},
							},
						},
					}),
		},
	});
}

onMounted(build);
onBeforeUnmount(() => {
	chart?.destroy();
	chart = null;
});

watch(
	() => [props.labels, props.data, props.type],
	() => build(),
	{ deep: true },
);
</script>

<template>
	<div :style="{ height: `${height}px`, position: 'relative' }">
		<canvas ref="canvas" />
	</div>
</template>
