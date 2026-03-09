ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS streak_current INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_best INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_active_date DATE;
