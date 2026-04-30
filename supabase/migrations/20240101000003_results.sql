create table if not exists public.results (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  graph_json jsonb not null,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create index if not exists results_expires_at_idx on public.results (expires_at);

create or replace function public.delete_expired_results()
returns void
language sql
security definer
as $$
  delete from public.results where expires_at < now();
  update public.jobs
  set status = 'expired'
  where status = 'complete'
    and id not in (select job_id from public.results);
$$;
