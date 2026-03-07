-- Agregar soporte para team_leader
-- Correr en Supabase → SQL Editor

-- El campo team_role ya existe, solo actualizamos los valores permitidos
-- 'owner' | 'team_leader' | 'member'

-- Índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_role ON public.subscriptions(team_id, team_role);
