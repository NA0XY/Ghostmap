alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.results enable row level security;
alter table public.usage enable row level security;

drop policy if exists "users: select own" on public.users;
create policy "users: select own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users: update own" on public.users;
create policy "users: update own" on public.users
  for update using (auth.uid() = id);

drop policy if exists "jobs: select own" on public.jobs;
create policy "jobs: select own" on public.jobs
  for select using (auth.uid() = user_id);

drop policy if exists "jobs: insert own" on public.jobs;
create policy "jobs: insert own" on public.jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists "results: select own jobs" on public.results;
create policy "results: select own jobs" on public.results
  for select using (
    exists (
      select 1 from public.jobs
      where public.jobs.id = public.results.job_id
        and public.jobs.user_id = auth.uid()
    )
  );

drop policy if exists "usage: select own" on public.usage;
create policy "usage: select own" on public.usage
  for select using (auth.uid() = user_id);
