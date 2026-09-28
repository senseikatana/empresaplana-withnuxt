// Shared transit search logic used by the server API and the static demo client.

export type StopTime = { town: string; stop: string; time: string };

export type FareRow = {
	id: string;
	name: string;
	zoneCount: number;
	priceCents: number;
};

export type TripRow = {
	id: number;
	lineId: number;
	lineName: string;
	signNumber: string | null;
	slug: string;
	pdfUrl: string | null;
	paymentSystem: string;
	direction: number;
	departure: string;
	arrival: string | null;
	dayType?: string;
	stops: StopTime[];
};

export type PriceOption = { id: string; name: string; priceCents: number };

export type DirectResult = {
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
	price: PriceOption[] | null;
};

export type TransferOption = {
	transferTown: string;
	waitMin: number;
	totalDurationMin: number;
	zones: number | null;
	price: PriceOption[] | null;
	legs: DirectResult[];
};

export type SearchParams = {
	from: string;
	to: string;
	timeFrom?: string | null;
	timeTo?: string | null;
	dayType?: string | null;
	type?: "direct" | "transfer";
};

export type SearchOutput = {
	direct: DirectResult[];
	transfers: TransferOption[];
};

export function toMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

export function durationMin(from: string, to: string): number {
	const diff = toMinutes(to) - toMinutes(from);
	return diff >= 0 ? diff : diff + 24 * 60;
}

export function zoneCountFor(
	stops: { town: string }[],
	zones: Map<string, string>,
): number | null {
	const found = new Set<string>();
	for (const s of stops) {
		const z = zones.get(s.town);
		if (!z) return null;
		found.add(z);
	}
	if (!found.size) return null;
	return Math.min(found.size, 4);
}

export function pricesFor(
	zones: number | null,
	fares: FareRow[],
): PriceOption[] | null {
	if (!zones) return null;
	const rows = fares.filter((f) => f.zoneCount === zones);
	if (!rows.length) return null;
	return rows.map((f) => ({
		id: f.id,
		name: f.name,
		priceCents: f.priceCents,
	}));
}

type Segment = { fromIndex: number; toIndex: number };

export function findSegment(
	stops: StopTime[],
	from: string,
	to: string,
): Segment | null {
	const fromIndex = stops.findIndex((s) => s.town === from);
	if (fromIndex === -1) return null;
	for (let i = fromIndex + 1; i < stops.length; i++) {
		if (stops[i]?.town === to) return { fromIndex, toIndex: i };
	}
	return null;
}

export function buildResult(
	row: TripRow,
	segment: Segment,
	stops: StopTime[],
	zones: Map<string, string>,
	fares: FareRow[],
): DirectResult {
	const slice = stops.slice(segment.fromIndex, segment.toIndex + 1);
	const departure = stops[segment.fromIndex]?.time ?? "";
	const arrival = stops[segment.toIndex]?.time ?? "";
	const zoneCount = zoneCountFor(slice, zones);
	return {
		lineId: row.lineId,
		signNumber: row.signNumber,
		lineName: row.lineName,
		slug: row.slug,
		pdfUrl: row.pdfUrl,
		paymentSystem: row.paymentSystem,
		departure,
		arrival,
		durationMin: durationMin(departure, arrival),
		originStop: stops[segment.fromIndex]?.stop ?? "",
		destinationStop: stops[segment.toIndex]?.stop ?? "",
		stops: slice,
		zones: zoneCount,
		price: pricesFor(zoneCount, fares),
	};
}

export function searchDirect(
	rows: TripRow[],
	from: string,
	to: string,
	zones: Map<string, string>,
	fares: FareRow[],
	timeFrom?: string | null,
	timeTo?: string | null,
): DirectResult[] {
	const fromMin = timeFrom ? toMinutes(timeFrom) : null;
	const toMin = timeTo ? toMinutes(timeTo) : null;
	const direct: DirectResult[] = [];
	for (const row of rows) {
		const segment = findSegment(row.stops, from, to);
		if (!segment) continue;
		const result = buildResult(row, segment, row.stops, zones, fares);
		const dep = toMinutes(result.departure);
		if (fromMin !== null && dep < fromMin) continue;
		if (toMin !== null && dep > toMin) continue;
		direct.push(result);
	}
	direct.sort((a, b) => toMinutes(a.departure) - toMinutes(b.departure));
	return direct;
}

export function searchTransfers(
	rows: TripRow[],
	from: string,
	to: string,
	zones: Map<string, string>,
	fares: FareRow[],
	limit = 12,
): TransferOption[] {
	const legsFrom = rows.filter((r) => r.stops.some((s) => s.town === from));
	const legsTo = rows.filter((r) => r.stops.some((s) => s.town === to));
	const options: TransferOption[] = [];
	for (const leg1 of legsFrom) {
		const last = leg1.stops[leg1.stops.length - 1];
		if (!last) continue;
		const seg1 = findSegment(leg1.stops, from, last.town);
		if (!seg1 || seg1.toIndex <= seg1.fromIndex) continue;
		const transferTown = leg1.stops[seg1.toIndex]?.town;
		if (!transferTown || transferTown === from || transferTown === to) continue;
		const arr1 = leg1.stops[seg1.toIndex]?.time ?? "";
		for (const leg2 of legsTo) {
			if (leg2.stops[0]?.town !== transferTown) continue;
			const seg2 = findSegment(leg2.stops, transferTown, to);
			if (!seg2) continue;
			const dep2 = leg2.stops[seg2.fromIndex]?.time ?? "";
			const wait = toMinutes(dep2) - toMinutes(arr1);
			if (wait < 0 || wait > 90) continue;
			const leg1Result = buildResult(leg1, seg1, leg1.stops, zones, fares);
			const leg2Result = buildResult(leg2, seg2, leg2.stops, zones, fares);
			const fullStops = [...leg1Result.stops, ...leg2Result.stops.slice(1)];
			const zoneCount = zoneCountFor(fullStops, zones);
			options.push({
				transferTown,
				waitMin: wait,
				totalDurationMin:
					leg1Result.durationMin + wait + leg2Result.durationMin,
				zones: zoneCount,
				price: pricesFor(zoneCount, fares),
				legs: [leg1Result, leg2Result],
			});
		}
	}
	options.sort((a, b) => a.totalDurationMin - b.totalDurationMin);
	return options.slice(0, limit);
}

export function parseTimeRange(value: string | null | undefined): {
	from?: string;
	to?: string;
} {
	if (!value) return {};
	const range = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(value);
	if (range) return { from: range[1], to: range[2] };
	if (/^\d{2}:\d{2}$/.test(value)) return { from: value };
	return {};
}

export function runSearch(
	rows: TripRow[],
	zones: Map<string, string>,
	fares: FareRow[],
	params: SearchParams,
): SearchOutput {
	const dayType = params.dayType ?? "feiners";
	const rowsForDay = rows.filter(
		(row) => (row.dayType ?? "feiners") === dayType,
	);
	const direct = searchDirect(
		rowsForDay,
		params.from,
		params.to,
		zones,
		fares,
		params.timeFrom,
		params.timeTo,
	);
	const transfers =
		params.type === "transfer"
			? searchTransfers(rowsForDay, params.from, params.to, zones, fares)
			: [];
	return { direct, transfers };
}
