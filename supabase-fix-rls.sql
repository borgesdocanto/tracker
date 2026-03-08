-- Habilitar RLS en team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Solo el service role (backend) puede acceder — igual que el resto de las tablas
CREATE POLICY "Service role full access" ON public.team_invitations
  USING (true) WITH CHECK (true);
