-- =====================================================================================
-- gmDEI Editorial — Esquema Completo PostgreSQL + Supabase Auth + Row Level Security (RLS)
-- =====================================================================================

-- 1. Extensiones necesarias
create extension if not exists "uuid-ossp";

-- 2. Tabla de Perfiles (vinculada a auth.users de Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

-- Trigger automático para crear perfil al registrarse en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Tarifario Global y Estándares (editable desde /admin)
create table if not exists public.pricing_settings (
  id int primary key default 1 check (id = 1),
  base_rate_per_page numeric(10,2) not null default 3.50,
  surcharge_word_ready numeric(10,2) not null default 0.00,          -- +4 Word listo (ruta base más económica)
  surcharge_pdf_conversion numeric(10,2) not null default 120.00,    -- +3 PDF (conversión a Word)
  surcharge_jpg_numbered numeric(10,2) not null default 210.00,      -- +2 JPG numerados por página (OCR + compilación)
  surcharge_loose_files numeric(10,2) not null default 280.00,       -- +1 Digitado en archivos sueltos (compilación)
  surcharge_jpg_unorganized numeric(10,2) not null default 390.00,   -- 0 JPG sin organizar (organización + OCR, menor costo que digitación)
  surcharge_manuscript numeric(10,2) not null default 650.00,        -- 0 Manuscrito (digitación completa, recorrido más largo y mayor costo)
  image_edit_cost numeric(10,2) not null default 15.00,              -- Costo por edición de imagen detectada
  image_insert_cost numeric(10,2) not null default 18.00,            -- Costo por inclusión de imagen nueva
  table_layout_cost numeric(10,2) not null default 25.00,            -- Costo por maquetación de tabla
  extra_round_cost numeric(10,2) not null default 85.00,             -- Costo por ronda de corrección extra
  extra_printed_sample_cost numeric(10,2) not null default 95.00,    -- Costo por muestra física impresa extra
  whatsapp_official text not null default '59170000000',
  email_official text not null default 'correcciones@gmdei.com',
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id) values (1) on conflict (id) do nothing;

-- 4. Proyectos Editoriales
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique, -- Ej: GMDEI-2026-4821
  client_id uuid references public.profiles(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  book_title text not null,
  book_size text not null default '15 x 21 cm (Estándar Editorial)',
  entry_condition text not null check (
    entry_condition in (
      'word_ready',
      'pdf',
      'jpg_numbered',
      'loose_files',
      'jpg_unorganized',
      'manuscript'
    )
  ),
  entry_level_badge text not null, -- '+4', '+3', '+2', '+1', '0'
  detected_pages int not null default 120,
  detected_images int not null default 0,
  wants_image_editing boolean not null default false,
  images_to_add int not null default 0,
  detected_tables int not null default 0,
  table_specifications text default '',
  correction_channel text not null check (correction_channel in ('whatsapp', 'email')),
  total_cost numeric(10,2) not null default 0,
  deposit_50 numeric(10,2) not null default 0,
  deposit_paid boolean not null default false,
  balance_paid boolean not null default false,
  signature_data_url text,
  signed_at timestamptz,
  current_stage int not null default 1 check (current_stage between 1 and 11),
  -- Límites y contadores globales
  digitacion_jpg_chances_left int not null default 6,   -- Hasta 6 correcciones en etapa de Digitación y condición JPG
  general_diagram_chances_left int not null default 3,  -- Hasta 3 correcciones generales de diagramación
  printed_samples_left int not null default 3,          -- Hasta 3 muestras impresas por proyecto
  printed_samples_delivered int not null default 0,
  -- Controles especiales Etapas 9 y 10
  cover_approved boolean not null default false,
  cover_preview_url text default '/assets/portada-1.jpg',
  flipbook_url text default '',
  proof_pdf_url text default '',
  final_files_url text default '/ATENEO_OCOENO_FINAL.pdf',
  isbn_code text default '',
  stage10_uppercase_approval text default '',
  stage10_approved_at timestamptz,
  -- Precios por etapa y desglose personalizado en JSONB
  stage_prices jsonb not null default '{}'::jsonb,
  stages_state jsonb not null default '[]'::jsonb,
  extra_addendums jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Registro de Rondas de Corrección y Aprobaciones
create table if not exists public.correction_logs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_number int not null,
  stage_name text not null,
  round_code text not null, -- [CODIGO | ETAPA | Ronda X/Y]
  channel text not null check (channel in ('whatsapp', 'email')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =====================================================================================
-- POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- =====================================================================================

alter table public.profiles enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.projects enable row level security;
alter table public.correction_logs enable row level security;

-- Helper function para verificar si el usuario autenticado es Admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Políticas para profiles:
-- Cada cliente ve únicamente su propio perfil; el Admin ve y edita todos.
create policy "Clientes ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Clientes actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- Políticas para pricing_settings:
-- Lectura pública para el cotizador en (/); escritura exclusiva para rol admin.
create policy "Tarifario visible para cotizador público"
  on public.pricing_settings for select
  using (true);

create policy "Solo admin edita tarifario global"
  on public.pricing_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Políticas para projects:
-- Cada cliente autenticado ve y actualiza ÚNICAMENTE su propio proyecto (client_id = auth.uid() o client_email = auth.jwt()->>'email').
-- El Admin tiene control total sobre todos los proyectos.
create policy "Cliente ve únicamente su propio proyecto"
  on public.projects for select
  using (
    auth.uid() = client_id
    or lower(client_email) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_admin()
  );

create policy "Creación de proyecto al confirmar cotización y depósito"
  on public.projects for insert
  with check (
    auth.uid() = client_id
    or lower(client_email) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_admin()
  );

create policy "Cliente actualiza contadores/aprobaciones de su propio proyecto y Admin todo"
  on public.projects for update
  using (
    auth.uid() = client_id
    or lower(client_email) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_admin()
  );

create policy "Solo Admin elimina proyectos"
  on public.projects for delete
  using (public.is_admin());

-- Políticas para correction_logs:
create policy "Cliente ve historial de rondas de su propio proyecto"
  on public.correction_logs for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = correction_logs.project_id
        and (p.client_id = auth.uid() or lower(p.client_email) = lower(coalesce(auth.jwt()->>'email', '')) or public.is_admin())
    )
  );

create policy "Cliente registra ronda de corrección en su propio proyecto"
  on public.correction_logs for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = correction_logs.project_id
        and (p.client_id = auth.uid() or lower(p.client_email) = lower(coalesce(auth.jwt()->>'email', '')) or public.is_admin())
    )
  );
