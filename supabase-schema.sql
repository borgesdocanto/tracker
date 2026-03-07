-- ─── InstaCoach — Schema Supabase ────────────────────────────────────────────
-- Correr en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  name                  TEXT,
  avatar                TEXT,
  plan                  TEXT NOT NULL DEFAULT 'free',
  status                TEXT NOT NULL DEFAULT 'active',
  -- Google tokens (para sync del cron)
  google_access_token   TEXT,
  google_refresh_token  TEXT,
  google_token_expiry   TIMESTAMPTZ,
  -- MercadoPago
  mp_subscription_id    TEXT,
  mp_payer_id           TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  -- Teams
  team_id               UUID,
  team_role             TEXT DEFAULT 'member', -- 'owner' | 'member'
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  max_agents  INT DEFAULT 10,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id     UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  status      TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  invited_by  TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL,
  mp_payment_id TEXT,
  plan          TEXT NOT NULL,
  amount        NUMERIC NOT NULL,
  currency      TEXT DEFAULT 'ARS',
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_team ON public.subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.team_invitations(token);

-- Auto updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
