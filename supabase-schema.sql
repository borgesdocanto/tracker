-- ─── GALAS Management — Schema Supabase ─────────────────────────────────────
-- Correr en: Supabase Dashboard → SQL Editor

-- Tabla de usuarios / suscripciones
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  avatar          TEXT,
  plan            TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'pro' | 'agencia'
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'past_due'
  mp_subscription_id TEXT,                        -- ID de suscripción en MercadoPago
  mp_payer_id     TEXT,                           -- ID del pagador en MercadoPago
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  coach_messages_used  INT DEFAULT 0,             -- contador mensual Coach IA
  coach_reset_at       TIMESTAMPTZ DEFAULT now(), -- cuándo se resetea el contador
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Tabla de pagos / historial
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL,
  mp_payment_id   TEXT,
  plan            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  currency        TEXT DEFAULT 'ARS',
  status          TEXT NOT NULL,  -- 'approved' | 'pending' | 'rejected'
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS: cada usuario solo ve su propia fila
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies (el service role bypasea RLS, solo aplica al anon key)
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (email = current_user);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_payments_email ON public.payments(email);

-- Función para auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
