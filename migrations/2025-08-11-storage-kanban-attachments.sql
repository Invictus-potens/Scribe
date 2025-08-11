-- Storage setup for kanban attachments bucket and policies
-- Apply in Supabase SQL editor

-- 1) Create bucket if not exists (public for easy previews)
insert into storage.buckets (id, name, public)
values ('kanban-attachments', 'kanban-attachments', true)
on conflict (id) do nothing;

-- 2) Policies for objects in this bucket
do $$ begin
  begin
    create policy kanban_attach_select on storage.objects for select
      using (bucket_id = 'kanban-attachments');
  exception when duplicate_object then null; end;

  begin
    create policy kanban_attach_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'kanban-attachments');
  exception when duplicate_object then null; end;

  begin
    create policy kanban_attach_delete on storage.objects for delete to authenticated
      using (bucket_id = 'kanban-attachments');
  exception when duplicate_object then null; end;
end $$;


