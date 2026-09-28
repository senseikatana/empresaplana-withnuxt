-- atm_fares: una fila por título y cantidad de zonas.
ALTER TABLE public.atm_fares DROP CONSTRAINT IF EXISTS atm_fares_pkey;
ALTER TABLE public.atm_fares ADD CONSTRAINT atm_fares_pkey PRIMARY KEY (id, zone_count);
