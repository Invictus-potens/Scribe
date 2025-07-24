-- Users table
create table public.users (
  id uuid not null default gen_random_uuid (),
  email text not null,
  full_name text null,
  created_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email)
) TABLESPACE pg_default;

-- Folders table
create table public.folders (
  id uuid not null default gen_random_uuid (),
  name text not null,
  user_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint folders_pkey primary key (id),
  constraint folders_user_id_fkey foreign key (user_id) references users (id) on delete cascade
) tablespace pg_default;

-- Tags table
create table public.tags (
  id uuid not null default gen_random_uuid (),
  name text not null,
  user_id uuid null,
  color text null default '#3b82f6',
  created_at timestamp with time zone null default now(),
  constraint tags_pkey primary key (id),
  constraint tags_user_id_fkey foreign key (user_id) references users (id) on delete cascade
) tablespace pg_default;

-- Calendar Events table
create table public.calendar_events (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  description text null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone null,
  all_day boolean null default false,
  color text null default '#3b82f6'::text,
  reminder_minutes integer null,
  reminder_set boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint calendar_events_pkey primary key (id),
  constraint calendar_events_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Notes table
create table public.notes (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  title text not null,
  content text not null,
  folder text null,
  tags text[] null,
  is_pinned boolean null default false,
  is_private boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint notes_pkey primary key (id),
  constraint notes_user_id_fkey foreign key (user_id) references auth.users (id)
) tablespace pg_default;


create extension if not exists "uuid-ossp"; // in case of the error  - extensions.uuid_generate_v4().

-- Migration to add color column to existing tags table (run this if the table already exists)
-- ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS color text null default '#3b82f6';

-- Migration to add reminder columns to existing calendar_events table (run this if the table already exists)
-- ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS reminder_minutes integer null;
-- ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS reminder_set boolean null default false;

-- Function to automatically delete past events (run this to create the function)
-- CREATE OR REPLACE FUNCTION cleanup_past_events()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM public.calendar_events 
--   WHERE start_date < CURRENT_DATE - INTERVAL '1 day';
-- END;
-- $$ LANGUAGE plpgsql;

-- Create a cron job or scheduled task to run cleanup_past_events() daily
-- You can use pg_cron extension or external scheduling