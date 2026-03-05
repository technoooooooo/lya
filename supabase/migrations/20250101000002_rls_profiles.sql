-- Helper function to check admin role (SECURITY DEFINER bypasses RLS)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Users can update their own profile (limited fields)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin can read all profiles
create policy "Admin can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Admin can update all profiles
create policy "Admin can update all profiles"
  on public.profiles for update
  using (public.is_admin());
