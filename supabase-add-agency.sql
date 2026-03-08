-- Agregar nombre de inmobiliaria a la tabla teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS agency_name TEXT;
