ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS plants_active_family_idx
  ON public.plants (family_id)
  WHERE archived_at IS NULL;