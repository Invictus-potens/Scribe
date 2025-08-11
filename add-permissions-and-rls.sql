-- Adiciona coluna de permissões e função utilitária, com políticas básicas de RLS

-- 1) Coluna de permissões no compartilhamento de boards
-- Observação: essas migrações foram movidas para `migrations/2025-08-11-company-kanban-ext.sql`.
-- Aplique-as diretamente no Supabase (SQL Editor) conforme instruções no README da migração.

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


-- 5) Índices e constraints para performance e unicidade
do $$ begin
  begin
    create unique index if not exists company_members_company_id_user_id_key
      on public.company_members(company_id, user_id);
  exception when duplicate_object then null; end;

  begin
    create index if not exists idx_company_members_user_id
      on public.company_members(user_id);
  exception when duplicate_object then null; end;

  begin
    create unique index if not exists shared_kanban_boards_board_company_unique
      on public.shared_kanban_boards(board_id, company_id);
  exception when duplicate_object then null; end;

  begin
    create index if not exists idx_shared_kanban_boards_company_id
      on public.shared_kanban_boards(company_id);
  exception when duplicate_object then null; end;

  begin
    create index if not exists idx_kanban_columns_board_id
      on public.kanban_columns(board_id);
  exception when duplicate_object then null; end;

  begin
    create index if not exists idx_kanban_cards_column_id
      on public.kanban_cards(column_id);
  exception when duplicate_object then null; end;
end $$;

-- 6) RPC transacionais e seguras (security definer)

-- 6.1 criar empresa + adicionar owner como membro (atômico)
create or replace function public.create_company_with_owner(
  p_name text,
  p_description text default null
)
returns public.companies
language plpgsql
security definer
as $$
declare
  v_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (name, description, owner_id)
  values (p_name, p_description, auth.uid())
  returning * into v_company;

  -- adicionar como membro owner (aceito)
  insert into public.company_members (company_id, user_id, role, status, joined_at)
  values (v_company.id, auth.uid(), 'owner', 'accepted', now());

  return v_company;
exception when others then
  -- rollback implícito por transação da função; propaga erro
  raise;
end;
$$;

-- 7) Auditoria e RPCs de membros foram movidos para `migrations/2025-08-11-company-kanban-ext.sql`.

-- 10) Ajuste no get_user_accessible_boards para retornar também company_id quando compartilhado
create or replace function public.get_user_accessible_boards()
returns table (
  id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  is_shared boolean,
  company_id uuid,
  company_name text,
  permissions jsonb
)
language sql
security definer
stable
as $$
  with combined as (
    -- próprios
    select b.id, b.title, b.created_at, b.updated_at,
           false as is_shared,
           null::uuid as company_id,
           null::text as company_name,
           '{
             "view_board": true,
             "manage_board": true,
             "manage_columns": true,
             "create_card": true,
             "edit_card": true,
             "move_card": true,
             "delete_card": true,
             "manage_members": true
           }'::jsonb as permissions
    from public.kanban_boards b
    where b.user_id = auth.uid()

    union all

    -- compartilhados via empresa em que o usuário é membro aceito
    select kb.id, kb.title, kb.created_at, kb.updated_at,
           true as is_shared,
           c.id as company_id,
           c.name as company_name,
           coalesce(skb.permissions, '{
             "view_board": true,
             "manage_board": false,
             "manage_columns": true,
             "create_card": true,
             "edit_card": true,
             "move_card": true,
             "delete_card": false,
             "manage_members": false
           }'::jsonb) as permissions
    from public.shared_kanban_boards skb
    join public.kanban_boards kb on kb.id = skb.board_id
    join public.companies c on c.id = skb.company_id
    join public.company_members cm on cm.company_id = skb.company_id
    where cm.user_id = auth.uid() and cm.status = 'accepted'
  )
  select *
  from (
    select distinct on (id) *
    from combined
    order by id, is_shared asc, created_at desc
  ) dedup
  order by created_at desc;
$$;

-- 6.2 convidar usuário com validações (não convidar a si mesmo, evitar duplicatas/pending)
drop function if exists public.invite_user_to_company(uuid, text, text);
create or replace function public.invite_user_to_company(
  p_company_id uuid,
  p_user_email text,
  p_role text default 'member'
)
returns table (success boolean, message text)
language plpgsql
security definer
as $$
declare
  v_target_user_id uuid;
  v_is_member boolean;
  v_has_pending boolean;
  v_is_owner_or_admin boolean;
begin
  if auth.uid() is null then
    return query select false, 'Not authenticated';
    return;
  end if;

  -- somente owner/admin da empresa pode convidar
  select exists (
    select 1 from public.company_members cm1
    where cm1.company_id = p_company_id
      and cm1.user_id = auth.uid()
      and cm1.status = 'accepted'
      and cm1.role in ('owner','admin')
  ) into v_is_owner_or_admin;

  if not v_is_owner_or_admin then
    return query select false, 'Not allowed to invite for this company';
    return;
  end if;

  -- localizar usuário por email (tenta em profiles e auth.users)
  select id from public.users where email = p_user_email limit 1 into v_target_user_id;
  if v_target_user_id is null then
    select id from auth.users where email = p_user_email limit 1 into v_target_user_id;
  end if;

  if v_target_user_id is null then
    return query select false, 'User not found with this email';
    return;
  end if;

  if v_target_user_id = auth.uid() then
    return query select false, 'You cannot invite yourself';
    return;
  end if;

  -- já é membro?
  select exists (
    select 1 from public.company_members cm2
    where cm2.company_id = p_company_id and cm2.user_id = v_target_user_id and cm2.status = 'accepted'
  ) into v_is_member;
  if v_is_member then
    return query select false, 'User is already a member of this company';
    return;
  end if;

  -- convite pendente?
  select exists (
    select 1 from public.company_members cm3
    where cm3.company_id = p_company_id and cm3.user_id = v_target_user_id and cm3.status = 'pending'
  ) into v_has_pending;
  if v_has_pending then
    return query select false, 'An invitation is already pending for this user';
    return;
  end if;

  -- tentar reaproveitar registro antigo (ex.: declined) atualizando para pending
  if exists (
    select 1 from public.company_members cm4
    where cm4.company_id = p_company_id and cm4.user_id = v_target_user_id
  ) then
    update public.company_members cmu
      set role = (case when coalesce(p_role,'member') in ('owner','admin','member') then coalesce(p_role,'member') else 'member' end),
          status = 'pending',
          invited_by = auth.uid(),
          invited_at = now(),
          joined_at = null
    where cmu.company_id = p_company_id and cmu.user_id = v_target_user_id;
  else
    insert into public.company_members (company_id, user_id, role, status, invited_by, invited_at)
    values (
      p_company_id,
      v_target_user_id,
      case when coalesce(p_role,'member') in ('owner','admin','member') then coalesce(p_role,'member') else 'member' end,
      'pending',
      auth.uid(),
      now()
    );
  end if;

  perform public.log_company_action(p_company_id, 'invite_sent', v_target_user_id, jsonb_build_object('role', coalesce(p_role,'member')));
  return query select true, 'User invited successfully';
end;
$$;

-- 6.3 atualizar função de membro com regras simples
create or replace function public.update_company_member_role(
  p_company_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns table (success boolean, message text)
language plpgsql
security definer
as $$
declare
  v_requester_role text;
  v_target_role text;
begin
  if auth.uid() is null then
    return query select false, 'Not authenticated';
    return;
  end if;

  select role from public.company_members
  where company_id = p_company_id and user_id = auth.uid() and status = 'accepted'
  into v_requester_role;

  if v_requester_role is null or v_requester_role not in ('owner','admin') then
    return query select false, 'Not allowed to update roles';
    return;
  end if;

  select role from public.company_members
  where company_id = p_company_id and user_id = p_target_user_id
  into v_target_role;

  if v_target_role is null then
    return query select false, 'Target user is not a member';
    return;
  end if;

  if v_target_role = 'owner' then
    return query select false, 'Cannot change role of the owner';
    return;
  end if;

  update public.company_members
    set role = (case when coalesce(p_new_role,'member') in ('owner','admin','member') then coalesce(p_new_role,'member') else 'member' end)
  where company_id = p_company_id and user_id = p_target_user_id;

  perform public.log_company_action(p_company_id, 'role_updated', p_target_user_id, jsonb_build_object('new_role', p_new_role));
  return query select true, 'Role updated';
end;
$$;

-- 6.4 boards acessíveis (own + compartilhados) com permissões já resolvidas
create or replace function public.get_user_accessible_boards()
returns table (
  id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  is_shared boolean,
  company_name text,
  permissions jsonb
)
language sql
security definer
stable
as $$
  with combined as (
    -- próprios
    select b.id, b.title, b.created_at, b.updated_at,
           false as is_shared,
           null::text as company_name,
           '{
             "view_board": true,
             "manage_board": true,
             "manage_columns": true,
             "create_card": true,
             "edit_card": true,
             "move_card": true,
             "delete_card": true,
             "manage_members": true
           }'::jsonb as permissions
    from public.kanban_boards b
    where b.user_id = auth.uid()

    union all

    -- compartilhados via empresa em que o usuário é membro aceito
    select kb.id, kb.title, kb.created_at, kb.updated_at,
           true as is_shared,
           c.name as company_name,
           coalesce(skb.permissions, '{
             "view_board": true,
             "manage_board": false,
             "manage_columns": true,
             "create_card": true,
             "edit_card": true,
             "move_card": true,
             "delete_card": false,
             "manage_members": false
           }'::jsonb) as permissions
    from public.shared_kanban_boards skb
    join public.kanban_boards kb on kb.id = skb.board_id
    join public.companies c on c.id = skb.company_id
    join public.company_members cm on cm.company_id = skb.company_id
    where cm.user_id = auth.uid() and cm.status = 'accepted'
  )
  select *
  from (
    select distinct on (id) *
    from combined
    order by id, is_shared asc, created_at desc
  ) dedup
  order by created_at desc;
$$;

