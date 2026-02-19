-- Promo codes table
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  max_uses integer,
  current_uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.promo_codes enable row level security;

-- Anyone can check if a code is valid (for signup form)
create policy "Anyone can check promo codes"
  on public.promo_codes for select
  using (true);

-- Only admin can manage promo codes
create policy "Admin can manage promo codes"
  on public.promo_codes for all
  using (public.is_admin());
