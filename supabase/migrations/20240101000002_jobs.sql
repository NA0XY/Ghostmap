do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type public.job_status as enum ('pending', 'processing', 'complete', 'failed', 'expired');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_classification') then
    create type public.job_classification as enum ('instant', 'moderate', 'heavy');
  end if;
end
$$;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  repo_url text not null,
  repo_owner text not null,
  repo_name text not null,
  status public.job_status not null default 'pending',
  classification public.job_classification not null default 'moderate',
  features jsonb not null default '["graph"]'::jsonb,
  file_count integer,
  commit_count integer,
  error_message text,
  queue_position integer,
  notify_email text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint heavy_jobs_require_email
    check (classification != 'heavy' or notify_email is not null)
);

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
