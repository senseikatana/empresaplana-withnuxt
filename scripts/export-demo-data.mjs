// Export the transit dataset from Postgres to public/data/transit.json
// for the static demo build (client-side search, no server needed).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
	const lines = (
		await client.query(`
			SELECT id, slug, name, sign_number AS "signNumber", legacy_ids AS "legacyIds",
			       pdf_url AS "pdfUrl", operator, payment_system AS "paymentSystem"
			FROM public.transit_lines ORDER BY id`)
	).rows;

	const stops = (
		await client.query("SELECT town, name, zone FROM public.transit_stops ORDER BY town, name")
	).rows;

	const trips = (
		await client.query(`
			SELECT t.id, t.line_id AS "lineId", l.name AS "lineName",
			       l.sign_number AS "signNumber", l.slug, l.pdf_url AS "pdfUrl",
			       l.payment_system AS "paymentSystem", t.direction,
			       to_char(t.departure, 'HH24:MI') AS departure,
			       to_char(t.arrival, 'HH24:MI') AS arrival,
			       t.stops, t.day_type AS "dayType"
			FROM public.transit_trips t
			JOIN public.transit_lines l ON l.id = t.line_id
			ORDER BY t.line_id, t.departure`)
	).rows;

	const zones = Object.fromEntries(
		(await client.query("SELECT municipality, zone FROM public.atm_zones")).rows.map((r) => [
			r.municipality,
			r.zone,
		]),
	);

	const fares = (
		await client.query(`
			SELECT id, name, zone_count AS "zoneCount", price_cents AS "priceCents"
			FROM public.atm_fares ORDER BY id, zone_count`)
	).rows;

	const localities = (
		await client.query("SELECT DISTINCT town FROM public.transit_stops ORDER BY town")
	).rows.map((r) => r.town);

	const dataset = {
		generatedAt: new Date().toISOString(),
		referenceDate: "2026-09-28",
		lines,
		stops,
		trips,
		zones,
		fares,
		localities,
	};

	const outDir = path.join(ROOT, "public/data");
	mkdirSync(outDir, { recursive: true });
	const json = JSON.stringify(dataset);
	writeFileSync(path.join(outDir, "transit.json"), json);
	console.log(
		`public/data/transit.json: ${trips.length} trips, ${lines.length} lines, ` +
			`${stops.length} stops, ${localities.length} localities (${(json.length / 1024 / 1024).toFixed(2)} MB)`,
	);
} finally {
	await client.end();
}
