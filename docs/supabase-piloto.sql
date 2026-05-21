create table if not exists public.modulo_pilot_database (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.modulo_pilot_database enable row level security;

-- La API local usa SUPABASE_SERVICE_ROLE_KEY, que omite RLS.
-- No crear politicas publicas para esta tabla durante el piloto.

-- Nota: esta tabla mantiene el modo piloto JSON original.
-- Para el modo nuevo por tablas, ejecutar tambien docs/supabase-tablas-piloto.sql
-- y configurar SUPABASE_STORAGE_MODE=tables.
