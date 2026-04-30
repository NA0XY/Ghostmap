create table if not exists public.usage (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  count integer not null default 0,
  primary key (user_id, date)
);

create index if not exists usage_user_date_idx on public.usage (user_id, date);

create or replace function public.increment_usage(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into public.usage (user_id, date, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set count = public.usage.count + 1
  returning count into new_count;

  return new_count;
end;
$$;

create or replace function public.get_usage_today(p_user_id uuid)
returns integer
language sql
security definer
as $$
  select coalesce(
    (select count from public.usage where user_id = p_user_id and date = current_date),
    0
  );
$$;
