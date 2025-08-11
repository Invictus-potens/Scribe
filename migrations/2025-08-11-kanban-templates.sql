-- Migration: Kanban templates (card/column/board)
-- Apply in Supabase SQL editor

create table if not exists public.kanban_card_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  description text,
  priority text check (priority in ('low','medium','high')) default 'medium',
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.kanban_column_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

create table if not exists public.kanban_board_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  columns jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.kanban_card_templates enable row level security;
alter table public.kanban_column_templates enable row level security;
alter table public.kanban_board_templates enable row level security;

-- Simple RLS: user-owned
do $$ begin
  begin
    create policy kct_select on public.kanban_card_templates for select using (auth.uid() = user_id);
  exception when duplicate_object then null; end;
  begin
    create policy kct_cud on public.kanban_card_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  exception when duplicate_object then null; end;

  begin
    create policy kcolt_select on public.kanban_column_templates for select using (auth.uid() = user_id);
  exception when duplicate_object then null; end;
  begin
    create policy kcolt_cud on public.kanban_column_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  exception when duplicate_object then null; end;

  begin
    create policy kbt_select on public.kanban_board_templates for select using (auth.uid() = user_id);
  exception when duplicate_object then null; end;
  begin
    create policy kbt_cud on public.kanban_board_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  exception when duplicate_object then null; end;
end $$;


