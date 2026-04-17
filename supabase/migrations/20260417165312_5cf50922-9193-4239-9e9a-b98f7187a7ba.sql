
CREATE TYPE public.plant_location AS ENUM ('indoor', 'outdoor');

CREATE TABLE public.plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location public.plant_location NOT NULL DEFAULT 'indoor',
  image_url TEXT,
  watering_frequency_days INTEGER NOT NULL DEFAULT 7 CHECK (watering_frequency_days > 0),
  last_watered_date DATE,
  next_watering_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plants"
  ON public.plants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert plants"
  ON public.plants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update plants"
  ON public.plants FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete plants"
  ON public.plants FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_plants_updated_at
  BEFORE UPDATE ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed dummy plants
INSERT INTO public.plants (name, location, image_url, watering_frequency_days, last_watered_date, next_watering_date) VALUES
  ('Monstera Deliciosa', 'indoor', NULL, 7, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE),
  ('Fiddle Leaf Fig', 'indoor', NULL, 10, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days'),
  ('Snake Plant', 'indoor', NULL, 14, CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE),
  ('Pothos', 'indoor', NULL, 7, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days'),
  ('Trumpet Honeysuckle', 'outdoor', NULL, 4, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE),
  ('Tomato Plant', 'outdoor', NULL, 2, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE),
  ('Lavender', 'outdoor', NULL, 5, CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE + INTERVAL '4 days'),
  ('Rose Bush', 'outdoor', NULL, 3, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE);
