-- Add favorite and archived flags to notes, if not exist
alter table if exists public.notes
  add column if not exists is_favorite boolean not null default false,
  add column if not exists is_archived boolean not null default false;

-- Optional index to speed up filters
create index if not exists idx_notes_user_fav_arch on public.notes (user_id, is_favorite, is_archived);

-- Templates table
create table if not exists public.note_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  tags text[] default '{}',
  created_at timestamp with time zone default now()
);

create index if not exists idx_note_templates_user on public.note_templates (user_id, created_at desc);
