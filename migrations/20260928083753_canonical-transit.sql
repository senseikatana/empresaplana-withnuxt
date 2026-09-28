-- Canonical transit dataset: lines, stops, trips and ATM fares.
-- Source of truth for the route finder (buscador de líneas).

-- ── Líneas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_lines (
  id             integer PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  sign_number    text,
  legacy_ids     integer[] NOT NULL DEFAULT '{}',
  pdf_url        text,
  operator       text NOT NULL DEFAULT 'Empresa Plana',
  payment_system text NOT NULL DEFAULT 'atm',
  active         boolean NOT NULL DEFAULT true,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Paradas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_stops (
  id   serial PRIMARY KEY,
  town text NOT NULL,
  name text NOT NULL,
  zone text,
  UNIQUE (town, name)
);

-- ── Recorrido base por línea y sentido ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_line_stops (
  line_id   integer NOT NULL REFERENCES public.transit_lines(id) ON DELETE CASCADE,
  direction smallint NOT NULL,
  seq       integer NOT NULL,
  stop_id   integer NOT NULL REFERENCES public.transit_stops(id) ON DELETE CASCADE,
  PRIMARY KEY (line_id, direction, seq)
);

-- ── Expediciones ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transit_trips (
  id             serial PRIMARY KEY,
  line_id        integer NOT NULL REFERENCES public.transit_lines(id) ON DELETE CASCADE,
  direction      smallint NOT NULL,
  day_type       text NOT NULL DEFAULT 'feiners',
  departure      time NOT NULL,
  arrival        time,
  variant        text,
  stops          jsonb NOT NULL DEFAULT '[]'::jsonb,
  source         text NOT NULL DEFAULT 'search',
  reference_date date,
  UNIQUE (line_id, direction, day_type, departure, arrival)
);

CREATE INDEX IF NOT EXISTS transit_trips_search_idx
  ON public.transit_trips (line_id, day_type, departure);
CREATE INDEX IF NOT EXISTS transit_trips_line_idx
  ON public.transit_trips (line_id, direction);

-- ── Tarifas ATM ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.atm_zones (
  municipality text PRIMARY KEY,
  zone         text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.atm_fares (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  validity    text,
  zone_count  smallint NOT NULL,
  price_cents integer NOT NULL,
  UNIQUE (id, zone_count)
);

CREATE TABLE IF NOT EXISTS public.payment_systems (
  id   text PRIMARY KEY,
  name text NOT NULL,
  note text
);

-- ── Acceso público de lectura (app server escribe como owner) ─────────────
ALTER TABLE public.transit_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_stops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_line_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_trips      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atm_zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atm_fares          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_systems    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_read_transit_lines ON public.transit_lines;
CREATE POLICY public_read_transit_lines ON public.transit_lines
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_transit_stops ON public.transit_stops;
CREATE POLICY public_read_transit_stops ON public.transit_stops
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_transit_line_stops ON public.transit_line_stops;
CREATE POLICY public_read_transit_line_stops ON public.transit_line_stops
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_transit_trips ON public.transit_trips;
CREATE POLICY public_read_transit_trips ON public.transit_trips
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_atm_zones ON public.atm_zones;
CREATE POLICY public_read_atm_zones ON public.atm_zones
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_atm_fares ON public.atm_fares;
CREATE POLICY public_read_atm_fares ON public.atm_fares
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_payment_systems ON public.payment_systems;
CREATE POLICY public_read_payment_systems ON public.payment_systems
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.transit_lines, public.transit_stops, public.transit_line_stops,
  public.transit_trips, public.atm_zones, public.atm_fares, public.payment_systems
  TO anon, authenticated;
