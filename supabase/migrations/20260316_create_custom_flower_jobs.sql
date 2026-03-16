create table if not exists public.custom_flower_jobs (
  id text primary key,
  status text not null default 'queued',
  stage text not null default 'queued',
  error text,
  flower jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_custom_flower_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists custom_flower_jobs_set_updated_at on public.custom_flower_jobs;

create trigger custom_flower_jobs_set_updated_at
before update on public.custom_flower_jobs
for each row
execute function public.set_custom_flower_jobs_updated_at();

alter table public.custom_flower_jobs enable row level security;

drop policy if exists "custom flower jobs are readable" on public.custom_flower_jobs;
create policy "custom flower jobs are readable"
on public.custom_flower_jobs
for select
to anon, authenticated
using (true);

drop policy if exists "service role manages custom flower jobs" on public.custom_flower_jobs;
create policy "service role manages custom flower jobs"
on public.custom_flower_jobs
for all
to service_role
using (true)
with check (true);
