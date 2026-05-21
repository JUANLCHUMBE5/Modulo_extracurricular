-- Fase 1: tablas reales para el piloto.
-- Ejecutar en Supabase SQL Editor antes de activar SUPABASE_STORAGE_MODE=tables.

create table if not exists public.categorias (
  id text primary key,
  nombre text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.estudiantes (
  id text primary key,
  dni text not null,
  nombres text,
  grado text,
  seccion text,
  tipo_alumno text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.programas (
  id text primary key,
  nombre text,
  periodo text,
  estado text,
  costo numeric default 0,
  cupos integer default 0,
  cupos_ocupados integer default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.invitados_por_programa (
  id text primary key,
  programa_id text not null,
  dni text,
  nombres text,
  grado text,
  seccion text,
  estado text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.inscripciones (
  id text primary key,
  programa_id text,
  dni_estudiante text,
  nombres_estudiante text,
  estado_inscripcion text,
  estado_pago text,
  fecha_registro timestamptz,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.documentos_generados (
  id text primary key,
  programa_id text,
  dni_estudiante text,
  fecha timestamptz,
  tipo_documento text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pagos (
  id text primary key,
  inscripcion_id text,
  dni_estudiante text,
  estado_pago text,
  fecha timestamptz,
  monto numeric default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.asistencias (
  id text primary key,
  programa_id text,
  inscripcion_id text,
  fecha date,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.historial_cargas (
  id text primary key,
  programa_id text,
  fecha timestamptz,
  estado text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.usuarios (
  id text primary key,
  usuario text,
  rol text,
  estado text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.plantillas_programa (
  id text primary key,
  programa_id text not null,
  plantilla text,
  actualizada_en timestamptz,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_programas_periodo on public.programas(periodo);
create index if not exists idx_programas_estado on public.programas(estado);
create index if not exists idx_inscripciones_programa on public.inscripciones(programa_id);
create index if not exists idx_inscripciones_dni on public.inscripciones(dni_estudiante);
create index if not exists idx_inscripciones_pago on public.inscripciones(estado_pago);
create index if not exists idx_pagos_inscripcion on public.pagos(inscripcion_id);
create index if not exists idx_pagos_dni on public.pagos(dni_estudiante);
create index if not exists idx_invitados_programa on public.invitados_por_programa(programa_id);
create index if not exists idx_invitados_dni on public.invitados_por_programa(dni);

alter table public.categorias enable row level security;
alter table public.estudiantes enable row level security;
alter table public.programas enable row level security;
alter table public.invitados_por_programa enable row level security;
alter table public.inscripciones enable row level security;
alter table public.documentos_generados enable row level security;
alter table public.pagos enable row level security;
alter table public.asistencias enable row level security;
alter table public.historial_cargas enable row level security;
alter table public.usuarios enable row level security;
alter table public.plantillas_programa enable row level security;

-- El backend usa SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY.
-- No crear politicas publicas para estas tablas durante el piloto.
