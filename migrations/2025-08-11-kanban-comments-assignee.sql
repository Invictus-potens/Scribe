-- Migration: Kanban comments and assignee_id support
-- Apply in Supabase SQL editor after previous migrations (has_board_permission required)

-- 1) Add assignee_id to kanban_cards (optional, safe to re-run with IF NOT EXISTS)
alter table if exists public.kanban_cards
  add column if not exists assignee_id uuid references public.users(id) on delete set null;

create index if not exists idx_kanban_cards_assignee_id on public.kanban_cards(assignee_id);

-- 2) Comments table
create table if not exists public.kanban_card_comments (
  id uuid default gen_random_uuid() primary key,
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  mentions uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_kanban_card_comments_card_id on public.kanban_card_comments(card_id);
create index if not exists idx_kanban_card_comments_created_at on public.kanban_card_comments(created_at);

-- RLS
alter table public.kanban_card_comments enable row level security;

-- Policies (requires has_board_permission function)
do $$ begin
  begin
    create policy kanban_card_comments_select on public.kanban_card_comments for select
    using (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_comments.card_id), 'view_board')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_card_comments_insert on public.kanban_card_comments for insert
    with check (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_comments.card_id), 'edit_card')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_card_comments_update on public.kanban_card_comments for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy kanban_card_comments_delete on public.kanban_card_comments for delete
    using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;


