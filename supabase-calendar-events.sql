-- Tabla de eventos comerciales persistidos
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email        TEXT NOT NULL REFERENCES public.subscriptions(email) ON DELETE CASCADE,
  team_id           UUID REFERENCES public.teams(id) ON DELETE SET NULL,

  -- Datos del evento Google
  google_event_id   TEXT NOT NULL,
  title             TEXT NOT NULL,
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ NOT NULL,

  -- Clasificación
  event_type        TEXT NOT NULL DEFAULT 'reunion',
  is_productive     BOOLEAN NOT NULL DEFAULT true,
  attendees_count   INTEGER DEFAULT 1,
  source            TEXT NOT NULL DEFAULT 'google_calendar',

  -- Períodos precalculados (AT TIME ZONE 'UTC' para que sean inmutables)
  duration_minutes  INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_at - start_at))::INTEGER / 60
  ) STORED,
  year              INTEGER GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM start_at AT TIME ZONE 'UTC')::INTEGER
  ) STORED,
  month             INTEGER GENERATED ALWAYS AS (
    EXTRACT(MONTH FROM start_at AT TIME ZONE 'UTC')::INTEGER
  ) STORED,
  quarter           INTEGER GENERATED ALWAYS AS (
    EXTRACT(QUARTER FROM start_at AT TIME ZONE 'UTC')::INTEGER
  ) STORED,
  week_of_year      INTEGER GENERATED ALWAYS AS (
    EXTRACT(WEEK FROM start_at AT TIME ZONE 'UTC')::INTEGER
  ) STORED,
  day_of_week       INTEGER GENERATED ALWAYS AS (
    EXTRACT(DOW FROM start_at AT TIME ZONE 'UTC')::INTEGER
  ) STORED,
  hour_of_day       INTEGER GENERATED ALWAYS AS (
    EXTRACT(HOUR FROM start_at AT TIME ZONE 'UTC')::INTEGER
  ) STORED,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_email, google_event_id)
);

-- Índices para queries de analytics
CREATE INDEX IF NOT EXISTS idx_ce_user_email   ON public.calendar_events(user_email);
CREATE INDEX IF NOT EXISTS idx_ce_team_id      ON public.calendar_events(team_id);
CREATE INDEX IF NOT EXISTS idx_ce_start_at     ON public.calendar_events(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_user_start   ON public.calendar_events(user_email, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_team_start   ON public.calendar_events(team_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_year_quarter ON public.calendar_events(user_email, year, quarter);
CREATE INDEX IF NOT EXISTS idx_ce_event_type   ON public.calendar_events(user_email, event_type);

-- RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.calendar_events
  USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
