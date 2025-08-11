-- Migration: WIP limit for kanban columns
-- Apply in Supabase SQL editor

alter table if exists public.kanban_columns
  add column if not exists wip_limit integer;

-- Optional: enforce non-negative via check
do $$ begin
  begin
    alter table public.kanban_columns
      add constraint kanban_columns_wip_limit_nonnegative check (wip_limit is null or wip_limit >= 0);
  exception when duplicate_object then null; end;
end $$;


