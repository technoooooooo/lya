-- Pillars table (5 pillars of Mathieu's method)
create table public.pillars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  pre_prompt text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger on_pillars_updated
  before update on public.pillars
  for each row execute function public.handle_updated_at();

-- Add foreign key on conversations.pillar_id
alter table public.conversations
  add constraint conversations_pillar_id_fkey
  foreign key (pillar_id) references public.pillars(id) on delete set null;

-- Enable RLS
alter table public.pillars enable row level security;

-- Everyone can read active pillars
create policy "Anyone can view active pillars"
  on public.pillars for select
  using (is_active = true);

-- Admin can manage pillars
create policy "Admin can manage pillars"
  on public.pillars for all
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );
