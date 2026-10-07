-- =============================================================
-- WESTERS ADMIN PANEL - SUPABASE DATABASE + STORAGE SETUP
-- Run this entire file in Supabase SQL Editor.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------
-- PROJECTS TABLE
-- -------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client text,
  location text,
  event_date date,
  description text,
  cover_image text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------
-- MEDIA TABLE
-- -------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  media_url text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists media_project_id_idx on public.media(project_id);
create index if not exists projects_published_idx on public.projects(published);
create index if not exists projects_event_date_idx on public.projects(event_date desc);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

-- -------------------------
-- ROW LEVEL SECURITY
-- -------------------------
alter table public.projects enable row level security;
alter table public.media enable row level security;

drop policy if exists "Public can view published projects" on public.projects;
create policy "Public can view published projects"
on public.projects
for select
to anon
using (published = true);

drop policy if exists "Authenticated can view all projects" on public.projects;
create policy "Authenticated can view all projects"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert projects" on public.projects;
create policy "Authenticated can insert projects"
on public.projects
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update projects" on public.projects;
create policy "Authenticated can update projects"
on public.projects
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete projects" on public.projects;
create policy "Authenticated can delete projects"
on public.projects
for delete
to authenticated
using (true);

drop policy if exists "Public can view media for published projects" on public.media;
create policy "Public can view media for published projects"
on public.media
for select
to anon
using (
  exists (
    select 1
    from public.projects p
    where p.id = media.project_id
      and p.published = true
  )
);

drop policy if exists "Authenticated can view all media" on public.media;
create policy "Authenticated can view all media"
on public.media
for select
to authenticated
using (true);

drop policy if exists "Authenticated can insert media" on public.media;
create policy "Authenticated can insert media"
on public.media
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update media" on public.media;
create policy "Authenticated can update media"
on public.media
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete media" on public.media;
create policy "Authenticated can delete media"
on public.media
for delete
to authenticated
using (true);

-- -------------------------
-- STORAGE BUCKET
-- -------------------------
insert into storage.buckets (id, name, public)
values ('westers-media', 'westers-media', true)
on conflict (id) do update set public = true;

-- Public website can display files from this bucket.
drop policy if exists "Public can view westers media" on storage.objects;
create policy "Public can view westers media"
on storage.objects
for select
to public
using (bucket_id = 'westers-media');

-- Only authenticated users can upload.
drop policy if exists "Authenticated can upload westers media" on storage.objects;
create policy "Authenticated can upload westers media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'westers-media');

drop policy if exists "Authenticated can update westers media" on storage.objects;
create policy "Authenticated can update westers media"
on storage.objects
for update
to authenticated
using (bucket_id = 'westers-media')
with check (bucket_id = 'westers-media');

drop policy if exists "Authenticated can delete westers media" on storage.objects;
create policy "Authenticated can delete westers media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'westers-media');

-- Optional grants (RLS still controls access)
grant usage on schema public to anon, authenticated;
grant select on public.projects, public.media to anon;
grant select, insert, update, delete on public.projects, public.media to authenticated;

-- -------------------------
-- WEBSITE CONTENT CMS
-- -------------------------
create table if not exists public.site_content (
  page_path text primary key,
  changes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "Public can view website content" on public.site_content;
create policy "Public can view website content" on public.site_content
for select to anon, authenticated using (true);

drop policy if exists "Authenticated can insert website content" on public.site_content;
create policy "Authenticated can insert website content" on public.site_content
for insert to authenticated with check (true);

drop policy if exists "Authenticated can update website content" on public.site_content;
create policy "Authenticated can update website content" on public.site_content
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete website content" on public.site_content;
create policy "Authenticated can delete website content" on public.site_content
for delete to authenticated using (true);

grant select on public.site_content to anon;
grant select, insert, update, delete on public.site_content to authenticated;
