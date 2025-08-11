-- Migration: Kanban attachments via public table + Storage integration
-- Apply in Supabase SQL editor, and create a Storage bucket (e.g., 'kanban-attachments') with RLS aligned

create table if not exists public.kanban_card_attachments (
  id uuid default gen_random_uuid() primary key,
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  file_name text not null,
  file_size bigint,
  mime_type text,
  storage_path text not null,
  created_at timestamptz default now()
);

create index if not exists idx_kca_card_id on public.kanban_card_attachments(card_id);
alter table public.kanban_card_attachments enable row level security;

-- Policies based on board permission
do $$ begin
  begin
    create policy kca_select on public.kanban_card_attachments for select
    using (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_attachments.card_id), 'view_board')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kca_insert on public.kanban_card_attachments for insert
    with check (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_attachments.card_id), 'edit_card')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kca_delete on public.kanban_card_attachments for delete
    using (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_attachments.card_id), 'edit_card')
    );
  exception when duplicate_object then null; end;
end $$;


