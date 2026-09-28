import { z } from "zod";

const querySchema = z.object({
	from: z.string().min(1).max(120),
	to: z.string().min(1).max(120),
	time: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional(),
	date: z.string().max(10).optional(),
	type: z.enum(["direct", "transfer"]).default("direct"),
});

type StopTime = { town: string; stop: string; time: string };

type TripRow = {
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
	stops: StopTime[];
};

type FareRow = { id: string; name: string; zoneCount: number; priceCents: number };

let zonesCache: Map<string, string> | null = null;
let faresCache: FareRow[] | null = null;

async function loadZones(): Promise<Map<string, string>> {
	if (zonesCache) return zonesCache;
	const rows = await prisma().$queryRaw<{ town: string; zone: string }[]>`
		SELECT DISTINCT town, zone FROM public.transit_stops WHERE zone IS NOT NULL`;
	zonesCache = new Map(rows.map((r) => [r.town, r.zone]));
	return zonesCache;
}

async function loadFares(): Promise<FareRow[]> {
	if (faresCache) return faresCache;
	faresCache = await prisma().$queryRaw<FareRow[]>`
		SELECT id, name, zone_count AS "zoneCount", price_cents AS "priceCents"
		FROM public.atm_fares ORDER BY id, zone_count`;
	return faresCache;
}

function toMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

function durationMin(from: string, to: string): number {
	const diff = toMinutes(to) - toMinutes(from);
	return diff >= 0 ? diff : diff + 24 * 60;
}

function zoneCountFor(
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

function pricesFor(
	zones: number | null,
	fares: FareRow[],
): { id: string; name: string; priceCents: number }[] | null {
	if (!zones) return null;
	const rows = fares.filter((f) => f.zoneCount === zones);
	if (!rows.length) return null;
	return rows.map((f) => ({ id: f.id, name: f.name, priceCents: f.priceCents }));
}

type Segment = {
	fromIndex: number;
	toIndex: number;
};

function findSegment(stops: StopTime[], from: string, to: string): Segment | null {
	const fromIndex = stops.findIndex((s) => s.town === from);
	if (fromIndex === -1) return null;
	for (let i = fromIndex + 1; i < stops.length; i++) {
		if (stops[i]!.town === to) return { fromIndex, toIndex: i };
	}
	return null;
}

function buildResult(
	row: TripRow,
	segment: Segment,
	stops: StopTime[],
	zones: Map<string, string>,
	fares: FareRow[],
) {
	const slice = stops.slice(segment.fromIndex, segment.toIndex + 1);
	const departure = stops[segment.fromIndex]!.time;
	const arrival = stops[segment.toIndex]!.time;
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
		originStop: stops[segment.fromIndex]!.stop,
		destinationStop: stops[segment.toIndex]!.stop,
		stops: slice,
		zones: zoneCount,
		price: pricesFor(zoneCount, fares),
	};
}

export default defineEventHandler(async (event) => {
	const parsed = querySchema.safeParse(getQuery(event));
	if (!parsed.success) {
		throw createError({ statusCode: 400, statusMessage: "Origen i destinació requerits" });
	}
	const { from, to, time, type } = parsed.data;
	if (from === to) {
		throw createError({ statusCode: 400, statusMessage: "Origen i destinació han de ser diferents" });
	}

	const [zones, fares] = await Promise.all([loadZones(), loadFares()]);

	const rows = await prisma().$queryRaw<TripRow[]>`
		SELECT t.id, t.line_id AS "lineId", l.name AS "lineName",
		       l.sign_number AS "signNumber", l.slug, l.pdf_url AS "pdfUrl",
		       l.payment_system AS "paymentSystem", t.direction,
		       to_char(t.departure, 'HH24:MI') AS departure,
		       to_char(t.arrival, 'HH24:MI') AS arrival,
		       t.stops
		FROM public.transit_trips t
		JOIN public.transit_lines l ON l.id = t.line_id
		WHERE t.stops @> ${JSON.stringify([{ town: from }])}::jsonb
		  AND t.stops @> ${JSON.stringify([{ town: to }])}::jsonb
		ORDER BY t.departure`;

	const timeFrom = time ? toMinutes(time) : null;
	const direct = [];
	for (const row of rows) {
		const segment = findSegment(row.stops, from, to);
		if (!segment) continue;
		const result = buildResult(row, segment, row.stops, zones, fares);
		if (timeFrom !== null && toMinutes(result.departure) < timeFrom) continue;
		direct.push(result);
	}
	direct.sort((a, b) => toMinutes(a.departure) - toMinutes(b.departure));

	let transfers: unknown[] = [];
	if (type === "transfer") {
		const legsFrom = await prisma().$queryRaw<TripRow[]>`
			SELECT t.id, t.line_id AS "lineId", l.name AS "lineName",
			       l.sign_number AS "signNumber", l.slug, l.pdf_url AS "pdfUrl",
			       l.payment_system AS "paymentSystem", t.direction,
			       to_char(t.departure, 'HH24:MI') AS departure,
			       to_char(t.arrival, 'HH24:MI') AS arrival,
			       t.stops
			FROM public.transit_trips t
			JOIN public.transit_lines l ON l.id = t.line_id
			WHERE t.stops @> ${JSON.stringify([{ town: from }])}::jsonb
			ORDER BY t.departure`;
		const legsTo = await prisma().$queryRaw<TripRow[]>`
			SELECT t.id, t.line_id AS "lineId", l.name AS "lineName",
			       l.sign_number AS "signNumber", l.slug, l.pdf_url AS "pdfUrl",
			       l.payment_system AS "paymentSystem", t.direction,
			       to_char(t.departure, 'HH24:MI') AS departure,
			       to_char(t.arrival, 'HH24:MI') AS arrival,
			       t.stops
			FROM public.transit_trips t
			JOIN public.transit_lines l ON l.id = t.line_id
			WHERE t.stops @> ${JSON.stringify([{ town: to }])}::jsonb
			ORDER BY t.departure`;

		const options: unknown[] = [];
		for (const leg1 of legsFrom) {
			const seg1 = findSegment(leg1.stops, from, leg1.stops[leg1.stops.length - 1]!.town);
			if (!seg1 || seg1.toIndex <= seg1.fromIndex) continue;
			const transferTown = leg1.stops[seg1.toIndex]!.town;
			if (transferTown === from || transferTown === to) continue;
			const arr1 = leg1.stops[seg1.toIndex]!.time;
			for (const leg2 of legsTo) {
				const first2 = leg2.stops[0]!.town;
				if (first2 !== transferTown) continue;
				const seg2 = findSegment(leg2.stops, transferTown, to);
				if (!seg2) continue;
				const dep2 = leg2.stops[seg2.fromIndex]!.time;
				const wait = toMinutes(dep2) - toMinutes(arr1);
				if (wait < 0 || wait > 90) continue;
				const leg1Result = buildResult(leg1, seg1, leg1.stops, zones, fares);
				const leg2Result = buildResult(leg2, seg2, leg2.stops, zones, fares);
				const fullStops = [...leg1Result.stops, ...leg2Result.stops.slice(1)];
				const zoneCount = zoneCountFor(fullStops, zones);
				options.push({
					transferTown,
					waitMin: wait,
					totalDurationMin: leg1Result.durationMin + wait + leg2Result.durationMin,
					zones: zoneCount,
					price: pricesFor(zoneCount, fares),
					legs: [leg1Result, leg2Result],
				});
			}
		}
		options.sort(
			(a, b) => (a as { totalDurationMin: number }).totalDurationMin - (b as { totalDurationMin: number }).totalDurationMin,
		);
		transfers = options.slice(0, 12);
	}

	return {
		query: { from, to, time: time ?? null, date: parsed.data.date ?? null, type },
		dayType: "feiners",
		referenceDate: "2026-09-28",
		direct,
		transfers,
	};
});
