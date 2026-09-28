import { resolveDayType } from "#shared/utils/dayType";
import {
	type FareRow,
	parseTimeRange,
	runSearch,
	type SearchOutput,
	type TripRow,
} from "#shared/utils/transit";

export type TransitSearchParams = {
	from: string;
	to: string;
	time?: string | null;
	date?: string | null;
	type?: "direct" | "transfer";
};

export function useTransitSearch() {
	const transit = useTransitData();

	async function search(params: TransitSearchParams): Promise<SearchOutput> {
		if (!transit.staticDemo) {
			return (await $fetch("/api/routes/search", {
				query: {
					from: params.from,
					to: params.to,
					...(params.time ? { time: params.time } : {}),
					...(params.date ? { date: params.date } : {}),
					type: params.type ?? "direct",
				},
			})) as SearchOutput;
		}
		const data = await transit.loadDemo();
		const { from: timeFrom, to: timeTo } = parseTimeRange(params.time);
		return runSearch(
			data.trips as TripRow[],
			new Map(Object.entries(data.zones)),
			data.fares as FareRow[],
			{
				from: params.from,
				to: params.to,
				timeFrom,
				timeTo,
				dayType: resolveDayType(params.date),
				type: params.type,
			},
		);
	}

	return { search };
}
