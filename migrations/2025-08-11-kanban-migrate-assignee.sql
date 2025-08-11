-- Migration: attempt to resolve textual assignee -> assignee_id by matching users.full_name or users.email
-- Review and run in Supabase SQL editor; safe to run multiple times

-- 1) Match by email
update public.kanban_cards k
set assignee_id = u.id
from public.users u
where k.assignee_id is null
  and k.assignee is not null
  and trim(lower(k.assignee)) = trim(lower(u.email));

-- 2) Match by full_name
update public.kanban_cards k
set assignee_id = u.id
from public.users u
where k.assignee_id is null
  and k.assignee is not null
  and trim(lower(k.assignee)) = trim(lower(u.full_name));


