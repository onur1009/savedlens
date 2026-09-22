-- ==============================================================================
-- SavedLens: Complete RLS & Collections Fix
-- Run this in Supabase Dashboard -> SQL Editor (Click 'Run')
-- ==============================================================================

-- 1. Ensure collections and join tables exist
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  name        text not null,
  color       text default '#6366f1',
  icon        text default 'folder',
  created_at  timestamptz default now()
);

create table if not exists public.bookmark_collections (
  bookmark_id   uuid not null references public.bookmarks(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (bookmark_id, collection_id)
);

-- 2. Allow bookmarks to be inserted without RLS blocking
alter table public.bookmarks enable row level security;
drop policy if exists "Allow all for bookmarks" on public.bookmarks;
drop policy if exists "Users can CRUD own bookmarks" on public.bookmarks;
create policy "Allow all for bookmarks"
  on public.bookmarks for all
  using (true)
  with check (true);

-- 3. Allow collections to be managed by extension & web app
alter table public.collections enable row level security;
drop policy if exists "Allow all for collections" on public.collections;
drop policy if exists "Users can CRUD own collections" on public.collections;
create policy "Allow all for collections"
  on public.collections for all
  using (true)
  with check (true);

-- 4. Allow bookmark_collections to be linked
alter table public.bookmark_collections enable row level security;
drop policy if exists "Allow all for bookmark_collections" on public.bookmark_collections;
drop policy if exists "Users can CRUD own bookmark collections" on public.bookmark_collections;
create policy "Allow all for bookmark_collections"
  on public.bookmark_collections for all
  using (true)
  with check (true);

-- 5. Allow profiles
alter table public.profiles enable row level security;
drop policy if exists "Allow all for profiles" on public.profiles;
create policy "Allow all for profiles"
  on public.profiles for all
  using (true)
  with check (true);

-- 6. Direct collection_id column on bookmarks
alter table public.bookmarks add column if not exists collection_id uuid references public.collections(id) on delete set null;

-- 7. Grant all table permissions
grant all on public.bookmarks to anon, authenticated, service_role;
grant all on public.collections to anon, authenticated, service_role;
grant all on public.bookmark_collections to anon, authenticated, service_role;
grant all on public.profiles to anon, authenticated, service_role;
