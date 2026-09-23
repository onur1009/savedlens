-- ==============================================================================
-- SavedLens Security Migration: API Tokens & Telegram Links
-- SEC-01 & SEC-03: Multi-tenant token authentication and verified Telegram linking
-- ==============================================================================

-- 1. Kullanıcıya özel API token tablosu (extension / mobil / Telegram bağlama için)
create table if not exists public.api_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  token_hash    text not null unique,           -- sha256(token) - ham token asla DB'de tutulmaz
  label         text default 'Extension',       -- 'Chrome Extension', 'Telegram', 'Mobile' vb.
  created_at    timestamptz default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

alter table public.api_tokens enable row level security;

-- Drop existing policy if re-running migration
drop policy if exists "Users can manage own api tokens" on public.api_tokens;

create policy "Users can manage own api tokens"
  on public.api_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_api_tokens_hash on public.api_tokens(token_hash) where revoked_at is null;
create index if not exists idx_api_tokens_user on public.api_tokens(user_id);

-- 2. Telegram chat <-> kullanıcı eşleşmesi (SEC-03)
create table if not exists public.telegram_links (
  chat_id       bigint primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  linked_at     timestamptz default now()
);

alter table public.telegram_links enable row level security;

-- Drop existing policy if re-running migration
drop policy if exists "Users can manage own telegram link" on public.telegram_links;

create policy "Users can manage own telegram link"
  on public.telegram_links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_telegram_links_user on public.telegram_links(user_id);
