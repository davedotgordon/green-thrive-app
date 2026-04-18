-- Enums for new fields
DO $$ BEGIN
  CREATE TYPE public.pot_size AS ENUM ('small','medium','large');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.establishment_level AS ENUM ('infant','young','mature','unsure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS pot_size public.pot_size NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS establishment_level public.establishment_level NOT NULL DEFAULT 'unsure',
  ADD COLUMN IF NOT EXISTS watering_volume integer NOT NULL DEFAULT 250;