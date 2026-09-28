import { z } from "zod";
import { resolveDayType } from "#shared/utils/dayType";
import {
	type FareRow,
	parseTimeRange,
	runSearch,
	type TripRow,
} from "#shared/utils/transit";

const querySchema = z.object({
	from: z.string().min(1).max(120),
	to: z.string().min(1).max(120),
	time: z
		.string()
		.regex(/^\d{2}:\d{2}(-\d{2}:\d{2})?$/)
		.optional(),
	date: z.string().max(10).optional(),
	type: z.enum(["direct", "transfer"]).default("direct"),
});

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

export default defineEventHandler(async (event) => {
	const parsed = querySchema.safeParse(getQuery(event));
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: "Origen i destinació requerits",
		});
	}
	const { from, to, time, type } = parsed.data;
	if (from === to) {
		throw createError({
			statusCode: 400,
			statusMessage: "Origen i destinació han de ser diferents",
		});
	}

	const dayType = resolveDayType(parsed.data.date);
	const [zones, fares] = await Promise.all([loadZones(), loadFares()]);
	const rows = await prisma().$queryRaw<TripRow[]>`
		SELECT t.id, t.line_id AS "lineId", l.name AS "lineName",
		       l.sign_number AS "signNumber", l.slug, l.pdf_url AS "pdfUrl",
		       l.payment_system AS "paymentSystem", t.direction,
		       to_char(t.departure, 'HH24:MI') AS departure,
		       to_char(t.arrival, 'HH24:MI') AS arrival,
		       t.day_type AS "dayType",
		       t.stops
		FROM public.transit_trips t
		JOIN public.transit_lines l ON l.id = t.line_id
		WHERE t.day_type = ${dayType}
		ORDER BY t.departure`;

	const { from: timeFrom, to: timeTo } = parseTimeRange(time);
	const { direct, transfers } = runSearch(rows, zones, fares, {
		from,
		to,
		timeFrom,
		timeTo,
		dayType,
		type,
	});

	return {
		query: {
			from,
			to,
			time: time ?? null,
			date: parsed.data.date ?? null,
			type,
		},
		dayType,
		referenceDate: "2026-09-28",
		direct,
		transfers,
	};
});
