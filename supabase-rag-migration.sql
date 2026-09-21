-- ==============================================================================
-- SavedLens V2.5 — RAG, Vector Search & Multimodal AI Migration
-- ==============================================================================

-- 1. Enable pgvector extension
create extension if not exists "vector";

-- 2. Add asynchronous processing, multimodal and vector columns to bookmarks
alter table public.bookmarks
  add column if not exists status text default 'completed' check (status in ('processing', 'completed', 'failed')),
  add column if not exists error_message text,
  add column if not exists transcript text,
  add column if not exists category text default 'other',
  add column if not exists actionable_data jsonb default '{}',
  add column if not exists embedding vector(1536);

-- Allow bookmarks to be ingested even if user profile is pending setup
alter table public.bookmarks alter column user_id drop not null;

-- 3. HNSW Vector Index for ultra-fast cosine similarity search
create index if not exists idx_bookmarks_embedding
  on public.bookmarks using hnsw (embedding vector_cosine_ops);

create index if not exists idx_bookmarks_status
  on public.bookmarks(user_id, status);

-- 4. Update backward-compatible view: saved_items
drop view if exists public.saved_items cascade;
create view public.saved_items as
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
  status,
  error_message,
  transcript,
  category,
  actionable_data,
  embedding,
  is_favorite as starred,
  created_at,
  updated_at
from public.bookmarks;

grant select on public.saved_items to authenticated, service_role;

-- 5. Semantic Vector Search RPC Function (Cosine Similarity)
create or replace function match_saved_items (
  query_embedding vector(1536),
  match_threshold float default 0.25,
  match_count int default 10,
  p_user_id uuid default null
)
returns table (
  id uuid,
  permalink text,
  title text,
  description text,
  summary text,
  transcript text,
  category text,
  actionable_data jsonb,
  thumbnail_url text,
  platform text,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    b.id,
    b.permalink,
    coalesce(b.author_name, b.author_username, 'İçerik') as title,
    b.caption as description,
    b.ai_summary as summary,
    b.transcript,
    b.category,
    b.actionable_data,
    case
      when array_length(b.stored_media_urls, 1) > 0 then b.stored_media_urls[1]
      when array_length(b.media_urls, 1) > 0 then b.media_urls[1]
      else null
    end as thumbnail_url,
    b.platform,
    (1 - (b.embedding <=> query_embedding))::float as similarity
  from public.bookmarks b
  where (p_user_id is null or b.user_id = p_user_id)
    and b.embedding is not null
    and (1 - (b.embedding <=> query_embedding)) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

grant execute on function match_saved_items to authenticated, service_role;

-- 6. Row-Level Security Policies for Seamless Ingestion
alter table public.bookmarks enable row level security;
drop policy if exists "Allow all for bookmarks" on public.bookmarks;
create policy "Allow all for bookmarks"
  on public.bookmarks for all
  using (true)
  with check (true);

alter table public.profiles enable row level security;
drop policy if exists "Allow all for profiles" on public.profiles;
create policy "Allow all for profiles"
  on public.profiles for all
  using (true)
  with check (true);

-- 7. Add collection_id direct foreign key to bookmarks
alter table public.bookmarks add column if not exists collection_id uuid references public.collections(id) on delete set null;

-- 8. Permissive RLS for collections and bookmark_collections
alter table public.collections enable row level security;
drop policy if exists "Allow all for collections" on public.collections;
create policy "Allow all for collections"
  on public.collections for all
  using (true)
  with check (true);

alter table public.bookmark_collections enable row level security;
drop policy if exists "Allow all for bookmark_collections" on public.bookmark_collections;
create policy "Allow all for bookmark_collections"
  on public.bookmark_collections for all
  using (true)
  with check (true);

