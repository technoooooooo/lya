-- Knowledge documents table
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  file_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger on_knowledge_documents_updated
  before update on public.knowledge_documents
  for each row execute function public.handle_updated_at();

alter table public.knowledge_documents enable row level security;

-- System can read (via service role), admin can manage
create policy "Authenticated users can read active knowledge documents"
  on public.knowledge_documents for select
  using (is_active = true);

create policy "Admin can manage knowledge documents"
  on public.knowledge_documents for all
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Guardrails table
create table public.guardrails (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('forbidden', 'exception')),
  subject text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger on_guardrails_updated
  before update on public.guardrails
  for each row execute function public.handle_updated_at();

alter table public.guardrails enable row level security;

create policy "Authenticated users can read active guardrails"
  on public.guardrails for select
  using (is_active = true);

create policy "Admin can manage guardrails"
  on public.guardrails for all
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- AI Config table (prompt principal, etc.)
create table public.ai_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

create trigger on_ai_config_updated
  before update on public.ai_config
  for each row execute function public.handle_updated_at();

alter table public.ai_config enable row level security;

create policy "Authenticated users can read AI config"
  on public.ai_config for select
  using (true);

create policy "Admin can manage AI config"
  on public.ai_config for all
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Seed default AI config
insert into public.ai_config (key, value) values
  ('system_prompt', 'Tu es Lya, l''assistant IA dédié au coaching golf de Mathieu. Tu réponds exclusivement dans le cadre de sa méthode et de ses 5 piliers. Tu ne donnes jamais de conseils provenant d''autres sources. Si une question sort du périmètre de la méthode, tu refuses poliment et tu rediriges vers les 5 piliers.');
