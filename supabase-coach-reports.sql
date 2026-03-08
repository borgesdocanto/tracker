CREATE TABLE IF NOT EXISTS public.coach_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email      TEXT NOT NULL REFERENCES public.subscriptions(email) ON DELETE CASCADE,
  period_key      TEXT NOT NULL,
  -- formato: "week:2025-W04" | "month:2025-01"
  period_label    TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  is_closed       BOOLEAN NOT NULL DEFAULT false,
  -- true = período terminado, no regenerar
  advice          TEXT NOT NULL,
  profile         TEXT NOT NULL DEFAULT '',
  week_totals     JSONB,
  green_total     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_email, period_key)
);

CREATE INDEX IF NOT EXISTS idx_cr_user_period ON public.coach_reports(user_email, period_key);

ALTER TABLE public.coach_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.coach_reports
  USING (true) WITH CHECK (true);

CREATE TRIGGER coach_reports_updated_at
  BEFORE UPDATE ON public.coach_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
