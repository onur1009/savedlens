-- ==============================================================================
-- SavedLens: Collections & Bookmark Collections Permissive RLS Fix
-- Run this in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Ensure collections table exists with all required columns
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  name        text not null,
  color       text default '#6366f1',
  icon        text default 'folder',
  created_at  timestamptz default now()
);

-- 2. Ensure bookmark_collections join table exists
create table if not exists public.bookmark_collections (
  bookmark_id   uuid not null references public.bookmarks(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (bookmark_id, collection_id)
);

-- 3. Configure Permissive Row Level Security (allows both logged-in users and extension sync)
alter table public.collections enable row level security;
drop policy if exists "Allow all for collections" on public.collections;
drop policy if exists "Users can CRUD own collections" on public.collections;
create policy "Allow all for collections"
  on public.collections for all
  using (true)
  with check (true);

alter table public.bookmark_collections enable row level security;
drop policy if exists "Allow all for bookmark_collections" on public.bookmark_collections;
drop policy if exists "Users can CRUD own bookmark collections" on public.bookmark_collections;
create policy "Allow all for bookmark_collections"
  on public.bookmark_collections for all
  using (true)
  with check (true);

-- 4. Direct collection_id column on bookmarks for optional fast filtering
alter table public.bookmarks add column if not exists collection_id uuid references public.collections(id) on delete set null;

-- 5. Grant permissions to anon and authenticated
grant all on public.collections to anon, authenticated, service_role;
grant all on public.bookmark_collections to anon, authenticated, service_role;
