-- Messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation_id on public.messages(conversation_id);

-- Enable RLS
alter table public.messages enable row level security;

-- Users can view messages from their own conversations
create policy "Users can view own messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = messages.conversation_id and user_id = auth.uid()
    )
  );

-- Users can insert messages into their own conversations
create policy "Users can create messages in own conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where id = messages.conversation_id and user_id = auth.uid()
    )
  );
