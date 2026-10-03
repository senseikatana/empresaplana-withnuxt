-- Resincroniza las secuencias de id con el máximo real de cada tabla.
--
-- PROBLEMA DETECTADO: el seed insertó filas con `id` explícito sin avanzar la
-- secuencia. Estado antes de esta migración:
--
--   Driver       max(id)=8   seq=2
--   Bus          max(id)=10  seq=1
--   Stop         max(id)=20  seq=1
--   Schedule     max(id)=10  seq=1
--   Notification max(id)=4   seq=1
--
-- Consecuencia: CUALQUIER `prisma.create()` en esas tablas fallaba con
-- `Unique constraint failed on the constraint: "<Tabla>_pkey"`, porque el
-- siguiente `nextval` devolvía un id ya ocupado. La app no podía crear
-- autobuses, paradas, horarios, conductores ni notificaciones.
--
-- Se resuelve de forma genérica (no tabla a tabla) para que cubra también
-- las tablas que se añadan en el futuro. `setval(seq, max, true)` deja el
-- siguiente `nextval` en `max + 1`; en tablas vacías se usa `is_called=false`
-- para que el primer id sea 1 y no 2.
--
-- OJO: `pg_get_serial_sequence()` recibe el nombre como *texto* y lo pasa a
-- minúsculas si no va citado, así que hay que pasarle `"RecentSearch"` (con
-- comillas dentro del literal), no `RecentSearch` — si no, falla con
-- `relation "recentsearch" does not exist`.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      quote_ident(c.relname) AS tabla_citada,
      c.relname              AS tabla,
      a.attname              AS columna
    FROM pg_class c
    JOIN pg_attribute a ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND pg_get_serial_sequence(quote_ident(c.relname), a.attname) IS NOT NULL
  LOOP
    EXECUTE format(
      $f$
        SELECT setval(
          pg_get_serial_sequence(%L, %L),
          GREATEST(COALESCE((SELECT max(%I) FROM %I), 0), 1),
          COALESCE((SELECT max(%I) FROM %I), 0) > 0
        )
      $f$,
      rec.tabla_citada, rec.columna,
      rec.columna, rec.tabla,
      rec.columna, rec.tabla
    );
  END LOOP;
END $$;
