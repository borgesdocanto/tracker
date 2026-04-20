-- Preferencias de mail por usuario
-- mail_prefs es un JSONB con la siguiente estructura:
-- {
--   "recv_agent": true,        -- recibir mail semanal de agente (lunes)
--   "recv_team": true,         -- recibir mail de equipo (broker/teamleader)
--   "include_self_activity": true,  -- incluir actividad propia en mail de equipo
--   "include_self_tokko": true      -- incluir fichas propias en mail de equipo
-- }

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS mail_prefs JSONB NOT NULL DEFAULT '{
    "recv_agent": true,
    "recv_team": true,
    "include_self_activity": true,
    "include_self_tokko": true
  }'::jsonb;
