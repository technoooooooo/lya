-- Allow admins to read all conversations (for user stats in admin panel)
create policy "Admin can view all conversations"
  on public.conversations for select
  using (public.is_admin());

-- Allow admins to read all messages (for user stats in admin panel)
create policy "Admin can view all messages"
  on public.messages for select
  using (public.is_admin());
