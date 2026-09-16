-- ==============================================================================
-- SavedLens V2.0 — Supabase Production Database Schema
-- Dewey (getdewey.co) Standard & Normalized Architecture
-- ==============================================================================

-- 1. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Profiles Table (Synced with Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile trigger on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Collections (Folders) Table
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  color       text default '#6366f1',
  icon        text default 'folder',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  unique(user_id, name)
);

alter table public.collections enable row level security;

create policy "Users can CRUD own collections"
  on public.collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Tags Table
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now(),

  unique(user_id, name)
);

alter table public.tags enable row level security;

create policy "Users can CRUD own tags"
  on public.tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Bookmarks Table (Dewey Unified Architecture)
create table if not exists public.bookmarks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  platform          text not null check (platform in ('instagram', 'twitter', 'tiktok', 'linkedin', 'youtube', 'custom', 'web')),
  external_id       text,
  permalink         text not null,
  author_username   text,
  author_name       text,
  author_avatar     text,
  caption           text,
  media_type        text default 'image' check (media_type in ('image', 'video', 'carousel', 'article')),
  media_urls        text[] default '{}',
  stored_media_urls text[] default '{}',    -- Permanent media backup (S3 / Supabase Storage)
  ai_summary        text,
  ai_tags           text[] default '{}',
  extractors        jsonb default '{}',     -- { recipe, location, discount, transcript }
  is_favorite       boolean default false,
  is_archived       boolean default false,
  saved_at          timestamptz default now(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),

  unique (user_id, permalink)
);

alter table public.bookmarks enable row level security;

create policy "Users can CRUD own bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Many-to-Many Relationships
create table if not exists public.bookmark_tags (
  bookmark_id   uuid not null references public.bookmarks(id) on delete cascade,
  tag_id        uuid not null references public.tags(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (bookmark_id, tag_id)
);

alter table public.bookmark_tags enable row level security;

create policy "Users can CRUD own bookmark tags"
  on public.bookmark_tags for all
  using (
    exists (
      select 1 from public.bookmarks b
      where b.id = bookmark_tags.bookmark_id and b.user_id = auth.uid()
    )
  );

create table if not exists public.bookmark_collections (
  bookmark_id   uuid not null references public.bookmarks(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (bookmark_id, collection_id)
);

alter table public.bookmark_collections enable row level security;

create policy "Users can CRUD own bookmark collections"
  on public.bookmark_collections for all
  using (
    exists (
      select 1 from public.bookmarks b
      where b.id = bookmark_collections.bookmark_id and b.user_id = auth.uid()
    )
  );

-- 7. Performance Indexes & Full-Text Search
create index if not exists idx_bookmarks_user_platform on public.bookmarks(user_id, platform);
create index if not exists idx_bookmarks_user_created on public.bookmarks(user_id, created_at desc);
create index if not exists idx_bookmarks_external_id on public.bookmarks(user_id, external_id);
create index if not exists idx_bookmarks_ai_tags on public.bookmarks using gin(ai_tags);
create index if not exists idx_bookmarks_search on public.bookmarks using gin(
  to_tsvector('turkish', coalesce(caption, '') || ' ' || coalesce(author_username, '') || ' ' || coalesce(ai_summary, ''))
);

-- 8. Backward Compatibility: View for legacy saved_items
create or replace view public.saved_items as
select
  id,
  user_id,
  permalink as url,
  platform,
  coalesce(author_name, author_username, 'İçerik') as title,
  caption as description,
  case
    when array_length(stored_media_urls, 1) > 0 then stored_media_urls[1]
    when array_length(media_urls, 1) > 0 then media_urls[1]
    else null
  end as thumbnail_url,
  ai_summary as summary,
  ai_tags as tags,
  extractors,
  null as raw_html,
  null as transcript,
  is_favorite as starred,
  created_at,
  updated_at
from public.bookmarks;
