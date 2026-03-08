CREATE TABLE IF NOT EXISTS public.pricing (
  plan_id     TEXT PRIMARY KEY,
  price_ars   INTEGER NOT NULL,
  mp_plan_id  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Valores iniciales
INSERT INTO public.pricing (plan_id, price_ars, mp_plan_id) VALUES
  ('individual', 10500, '747972aa67b04db798118e7352d94d65'),
  ('teams',      75000, 'b568c1f89a7d41a19e122712ae436dab')
ON CONFLICT (plan_id) DO NOTHING;

-- RLS
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la landing necesita leer sin autenticación)
CREATE POLICY "Public read" ON public.pricing
  FOR SELECT USING (true);

-- Solo service role puede escribir
CREATE POLICY "Service role write" ON public.pricing
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
