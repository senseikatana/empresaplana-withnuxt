import type { FareRow, TripRow } from "#shared/utils/transit";

export type DemoDataset = {
	generatedAt: string;
	referenceDate: string;
	lines: unknown[];
	trips: TripRow[];
	zones: Record<string, string>;
	fares: FareRow[];
	localities: string[];
};

export function useTransitData() {
	const config = useRuntimeConfig();
	const staticDemo = Boolean(config.public.staticDemo);
	const localities = useState<string[]>("transit-localities", () => []);
	const demo = useState<DemoDataset | null>("transit-demo-dataset", () => null);

	async function loadDemo(): Promise<DemoDataset> {
		if (demo.value) return demo.value;
		demo.value = await $fetch<DemoDataset>("/data/transit.json");
		return demo.value;
	}

	async function loadLocalities(): Promise<string[]> {
		if (localities.value.length) return localities.value;
		if (staticDemo) {
			const data = await loadDemo();
			localities.value = data.localities;
		} else {
			localities.value = await $fetch<string[]>("/api/routes/localities");
		}
		return localities.value;
	}

	return { staticDemo, localities, loadLocalities, loadDemo };
}

export function useTimeRanges() {
	const { t } = useI18n();
	return computed(() => [
		{ value: "", label: t("routes.search.anyTime") },
		...[
			"00:00-07:00",
			"07:00-10:00",
			"10:00-12:00",
			"12:00-16:00",
			"16:00-18:00",
			"18:00-20:00",
			"20:00-23:59",
		].map((value) => ({ value, label: value.replace("-", " – ") })),
	]);
}
