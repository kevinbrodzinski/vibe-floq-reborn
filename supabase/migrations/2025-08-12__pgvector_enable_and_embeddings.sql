-- Enable pgvector + add an embedding column to public.venues
-- Postgres 17.4 • pgvector 0.8.0

begin;

-- 1) Enable extension only if available (no-op if already installed)
do $$
begin
  if exists (select 1 from pg_available_extensions where name='vector') then
    execute 'create extension if not exists vector';
  else
    raise notice 'pgvector not available on this instance';
  end if;
end$$;

-- 2) Add nullable embedding column (dimension matches your model; 1536 fits OpenAI text-embedding-3-large)
alter table public.venues
  add column if not exists embedding vector(1536);

-- 3) HNSW index (fast ANN; supported in pgvector 0.8.0)
-- If you prefer IVFFLAT, comment this out and use the block below.
create index if not exists idx_venues_embedding_hnsw
on public.venues using hnsw (embedding vector_cosine_ops)
with (m=16, ef_construction=64);

comment on column public.venues.embedding is
  'pgvector embedding (1536). Use cosine distance. Populate via edge function/worker.';

-- 4) Helper setter for service-role usage
create or replace function public.set_venue_embedding(p_venue_id uuid, p vector)
returns void
language sql
security definer
set search_path = public
as $$
  update public.venues set embedding = p where id = p_venue_id;
$$;

commit;

-- Optional alternative to step 3 (IVFFLAT). Use ONLY one index type.
-- create index if not exists idx_venues_embedding_ivfflat
-- on public.venues using ivfflat (embedding vector_cosine_ops) with (lists=100);