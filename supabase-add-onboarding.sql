ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;
