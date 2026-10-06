ALTER TABLE public.plants
  ADD COLUMN min_temp_f integer,
  ADD COLUMN outdoor_exposure public.plant_exposure,
  ADD COLUMN move_suggestion text CHECK (move_suggestion IN ('indoor','outdoor')),
  ADD COLUMN move_reason text,
  ADD COLUMN move_suggested_date date;

CREATE TABLE public.family_weather (
  family_id text PRIMARY KEY,
  checked_date date NOT NULL,
  city text,
  rainfall_24h numeric NOT NULL DEFAULT 0,
  forecast jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.family_weather TO authenticated;
GRANT ALL ON public.family_weather TO service_role;
ALTER TABLE public.family_weather ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family members can view weather" ON public.family_weather
  FOR SELECT TO authenticated USING (family_id = public.current_family_id());