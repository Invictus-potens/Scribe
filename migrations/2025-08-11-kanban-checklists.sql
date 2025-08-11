-- Migration: Kanban checklist items per card
-- Apply in Supabase SQL editor

create table if not exists public.kanban_card_checklist_items (
  id uuid default gen_random_uuid() primary key,
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  content text not null,
  is_done boolean default false,
  order_index integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_kcci_card_id on public.kanban_card_checklist_items(card_id);
alter table public.kanban_card_checklist_items enable row level security;

-- updated_at trigger
do $$ begin
  begin
    create trigger update_kcci_updated_at before update on public.kanban_card_checklist_items
      for each row execute function update_updated_at_column();
  exception when duplicate_object then null; end;
end $$;

-- Policies via has_board_permission
do $$ begin
  begin
    create policy kcci_select on public.kanban_card_checklist_items for select
    using (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_checklist_items.card_id), 'view_board')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kcci_insert on public.kanban_card_checklist_items for insert
    with check (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_checklist_items.card_id), 'edit_card')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kcci_update on public.kanban_card_checklist_items for update
    using (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_checklist_items.card_id), 'edit_card')
    )
    with check (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_checklist_items.card_id), 'edit_card')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kcci_delete on public.kanban_card_checklist_items for delete
    using (
      public.has_board_permission((select kb.id from public.kanban_cards k
        join public.kanban_columns c on c.id = k.column_id
        join public.kanban_boards kb on kb.id = c.board_id
        where k.id = kanban_card_checklist_items.card_id), 'edit_card')
    );
  exception when duplicate_object then null; end;
end $$;


