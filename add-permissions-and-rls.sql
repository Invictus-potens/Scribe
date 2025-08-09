-- Adiciona coluna de permissões e função utilitária, com políticas básicas de RLS

-- 1) Coluna de permissões no compartilhamento de boards
alter table if exists public.shared_kanban_boards
add column if not exists permissions jsonb
  default '{
    "view_board": true,
    "manage_board": false,
    "manage_columns": true,
    "create_card": true,
    "edit_card": true,
    "move_card": true,
    "delete_card": false,
    "manage_members": false
  }'::jsonb;

-- 2) Função utilitária para checar permissão a partir do board
create or replace function public.has_board_permission(p_board_id uuid, p_perm text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.shared_kanban_boards sb
    join public.company_members cm
      on cm.company_id = sb.company_id
     and cm.user_id = auth.uid()
     and cm.status = 'accepted'
    where sb.board_id = p_board_id
      and coalesce(sb.permissions ->> p_perm, 'false')::boolean = true
  )
  or exists (
    select 1 from public.kanban_boards b
    where b.id = p_board_id and b.user_id = auth.uid()
  );
$$;

-- 3) Políticas básicas (ajuste nomes se já existirem)
do $$ begin
  begin
    create policy kanban_boards_select on public.kanban_boards for select
    using (
      user_id = auth.uid() or public.has_board_permission(id, 'view_board')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_boards_update on public.kanban_boards for update
    using (user_id = auth.uid() or public.has_board_permission(id, 'manage_board'))
    with check (user_id = auth.uid() or public.has_board_permission(id, 'manage_board'));
  exception when duplicate_object then null; end;

  begin
    create policy kanban_cards_select on public.kanban_cards for select
    using (
      public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'view_board')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_cards_insert on public.kanban_cards for insert
    with check (
      public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'create_card')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_cards_update on public.kanban_cards for update
    using (
      public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'edit_card')
      or public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'move_card')
    )
    with check (
      public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'edit_card')
      or public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'move_card')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_cards_delete on public.kanban_cards for delete
    using (
      public.has_board_permission((select board_id from public.kanban_columns c where c.id = kanban_cards.column_id), 'delete_card')
    );
  exception when duplicate_object then null; end;
end $$;

-- 4) Políticas para kanban_columns
do $$ begin
  begin
    create policy kanban_columns_select on public.kanban_columns for select
    using (
      public.has_board_permission(board_id, 'view_board')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_columns_insert on public.kanban_columns for insert
    with check (
      public.has_board_permission(board_id, 'manage_columns')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_columns_update on public.kanban_columns for update
    using (
      public.has_board_permission(board_id, 'manage_columns')
    )
    with check (
      public.has_board_permission(board_id, 'manage_columns')
    );
  exception when duplicate_object then null; end;

  begin
    create policy kanban_columns_delete on public.kanban_columns for delete
    using (
      public.has_board_permission(board_id, 'manage_columns')
    );
  exception when duplicate_object then null; end;
end $$;


