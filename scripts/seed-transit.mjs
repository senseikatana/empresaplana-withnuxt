// Seed the canonical transit dataset (lines, stops, trips, ATM fares) into Postgres.
// Usage: node scripts/seed-transit.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const data = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));

const lines = data("data/routes/lines-v3.json");
const trips = data("data/routes/trips-v3.json");
const stops = data("data/routes/stops-v2.json");
const zonesRaw = data("data/fares/atm-zones.json");
const faresRaw = data("data/fares/atm-fares.json");

const REFERENCE_DATES = {
	feiners: "2026-09-28",
	dissabtes: "2026-10-03",
	diumenges: "2026-10-04",
};

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .trim();

const TOWN_ALIASES = {
  "l'hospitalet de l'infant": "Vandellòs i l'Hospitalet de l'Infant",
  "miami platja": "Mont-roig del Camp",
  "aeroport de reus": "Reus",
  portaventura: "Salou",
  bonavista: "Tarragona",
  vilafortuny: "Cambrils",
  "la pineda": "Vila-seca",
  "complex educatiu de tarragona": "Tarragona",
  "poligon industrial de valls": "Valls",
  "poligono industrial de constanti": "Constantí",
  "poligon industrial de riu clar-tarragona": "Tarragona",
  "estacio del camp": null,
  "aeroport de barcelona - el prat de llobregat": null,
  barcelona: null,
};

const zoneIndex = new Map();
for (const [municipality, zone] of Object.entries(zonesRaw.zones)) {
  zoneIndex.set(norm(municipality), zone);
}

function zoneForTown(town) {
  const key = norm(town);
  if (key in TOWN_ALIASES) {
    const alias = TOWN_ALIASES[key];
    return alias ? (zoneIndex.get(norm(alias)) ?? null) : null;
  }
  return zoneIndex.get(key) ?? null;
}

function chunk(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function placeholders(rows, width, start = 1) {
  return rows
    .map(
      (_, r) =>
        `(${Array.from({ length: width }, (_, c) => `$${start + r * width + c}`).join(", ")})`,
    )
    .join(", ");
}

function flatten(rows) {
  return rows.flat();
}

async function insertBatch(client, table, columns, rows, conflict, width = columns.length) {
  for (const part of chunk(rows, 200)) {
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders(part, width)} ${conflict}`;
    await client.query(sql, flatten(part));
  }
}

function mostCommonSequence(lineTrips) {
  const counts = new Map();
  for (const t of lineTrips) {
    const key = t.stops.map((s) => `${s.town}|${s.stop}`).join(">");
    const entry = counts.get(key) ?? { seq: t.stops, n: 0 };
    entry.n += 1;
    counts.set(key, entry);
  }
  let best = null;
  for (const entry of counts.values()) if (!best || entry.n > best.n) best = entry;
  return best?.seq ?? [];
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await insertBatch(
      client,
      "public.transit_lines",
      ["id", "slug", "name", "sign_number", "legacy_ids", "pdf_url", "operator", "payment_system"],
      lines.map((l) => [
        l.id,
        l.slug,
        l.name,
        l.signNumber,
        l.legacyIds,
        l.pdf,
        l.operator,
        l.paymentSystem,
      ]),
      `ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name,
       sign_number=EXCLUDED.sign_number, legacy_ids=EXCLUDED.legacy_ids,
       pdf_url=EXCLUDED.pdf_url, operator=EXCLUDED.operator,
       payment_system=EXCLUDED.payment_system, updated_at=now()`,
    );

    await insertBatch(
      client,
      "public.transit_stops",
      ["town", "name", "zone"],
      stops.map((s) => [s.town, s.name, zoneForTown(s.town)]),
      `ON CONFLICT (town, name) DO UPDATE SET zone=EXCLUDED.zone`,
    );
    const stopRows = await client.query("SELECT id, town, name FROM public.transit_stops");
    const stopIds = new Map(stopRows.rows.map((r) => [`${r.town}|${r.name}`, r.id]));

    const byLine = new Map();
    for (const t of trips) {
      if (!byLine.has(t.lineId)) byLine.set(t.lineId, []);
      byLine.get(t.lineId).push(t);
    }

    const lineStopRows = [];
    for (const [lineId, lineTrips] of byLine) {
      for (const direction of [0, 1]) {
        const dirTrips = lineTrips.filter((t) => t.direction === direction);
        if (!dirTrips.length) continue;
        mostCommonSequence(dirTrips).forEach((s, seq) => {
          const stopId = stopIds.get(`${s.town}|${s.stop}`);
          if (stopId) lineStopRows.push([lineId, direction, seq, stopId]);
        });
      }
    }
    await insertBatch(
      client,
      "public.transit_line_stops",
      ["line_id", "direction", "seq", "stop_id"],
      lineStopRows,
      `ON CONFLICT (line_id, direction, seq) DO UPDATE SET stop_id=EXCLUDED.stop_id`,
    );

    // Replace the search-sourced schedule so removed departures do not linger.
    await client.query("DELETE FROM public.transit_trips WHERE source = 'search'");

    await insertBatch(
      client,
      "public.transit_trips",
      ["line_id", "direction", "day_type", "departure", "arrival", "stops", "source", "reference_date"],
      trips.map((t) => [
        t.lineId,
        t.direction,
        t.dayType ?? "feiners",
        t.departure,
        t.arrival,
        JSON.stringify(t.stops),
        "search",
        REFERENCE_DATES[t.dayType ?? "feiners"] ?? REFERENCE_DATES.feiners,
      ]),
      `ON CONFLICT (line_id, direction, day_type, departure, arrival) DO UPDATE
       SET stops=EXCLUDED.stops, source=EXCLUDED.source, reference_date=EXCLUDED.reference_date`,
    );

    await insertBatch(
      client,
      "public.atm_zones",
      ["municipality", "zone"],
      Object.entries(zonesRaw.zones).map(([m, z]) => [m, z]),
      `ON CONFLICT (municipality) DO UPDATE SET zone=EXCLUDED.zone`,
    );

    const fareRows = [];
    for (const ticket of faresRaw.tickets) {
      for (const [zoneCount, price] of Object.entries(ticket.prices)) {
        fareRows.push([
          ticket.id,
          ticket.name,
          ticket.validity ?? null,
          Number(zoneCount),
          Math.round(price * 100),
        ]);
      }
    }
    await insertBatch(
      client,
      "public.atm_fares",
      ["id", "name", "validity", "zone_count", "price_cents"],
      fareRows,
      `ON CONFLICT (id, zone_count) DO UPDATE SET name=EXCLUDED.name,
       validity=EXCLUDED.validity, price_cents=EXCLUDED.price_cents`,
    );

    await insertBatch(
      client,
      "public.payment_systems",
      ["id", "name", "note"],
      faresRaw.paymentSystems.map((p) => [p.id, p.name, p.note ?? null]),
      `ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, note=EXCLUDED.note`,
    );

    const counts = await client.query(`
      SELECT 'lines' AS t, count(*) FROM public.transit_lines
      UNION ALL SELECT 'stops', count(*) FROM public.transit_stops
      UNION ALL SELECT 'line_stops', count(*) FROM public.transit_line_stops
      UNION ALL SELECT 'trips', count(*) FROM public.transit_trips
      UNION ALL SELECT 'atm_zones', count(*) FROM public.atm_zones
      UNION ALL SELECT 'atm_fares', count(*) FROM public.atm_fares
      ORDER BY 1`);
    console.table(counts.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
