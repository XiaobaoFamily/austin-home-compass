-- Run once in a new Supabase project, then create your user in Auth > Users.
create table public.app_members (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.app_members enable row level security;
-- No client mutation policies: membership can only be granted through the SQL editor/admin.
create policy "self membership" on public.app_members for select to authenticated using(user_id = auth.uid());
create function public.is_member() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.app_members where user_id = (select auth.uid()));
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;
create table public.listings (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 address text not null check(char_length(address) between 1 and 300),
 url text not null check(url ~ '^https?://'), zip text not null check(zip ~ '^[0-9]{5}$'),
 property_type text not null default 'single_family' check(property_type = 'single_family'),
 price numeric not null check(price > 0), beds integer not null check(beds >= 4),
 status text not null default '待研究' check(status in ('待研究','值得看','已看房','考虑出价','放弃')),
 note text not null default '' check(char_length(note) <= 10000), created_at timestamptz not null default now()
);
create index listings_user_id on public.listings(user_id);
alter table public.listings enable row level security;
create policy "owner access" on public.listings for all to authenticated
 using(user_id = (select auth.uid()) and public.is_member())
 with check(user_id = (select auth.uid()) and public.is_member());
create table public.market_metrics (
 source text not null, region text not null, period date not null,
 metric text not null, value double precision not null,
 property_type text not null, source_url text not null,
 fetched_at timestamptz not null default now(),
 primary key(source,region,period,metric,property_type)
);
alter table public.market_metrics enable row level security;
create policy "members read metrics" on public.market_metrics for select to authenticated using(public.is_member());
create table public.ingestion_runs (
 id bigint generated always as identity primary key,
 source text not null, status text not null check(status in ('success','failed')),
 message text not null, created_at timestamptz not null default now()
);
alter table public.ingestion_runs enable row level security;
create policy "members read ingestion" on public.ingestion_runs for select to authenticated using(public.is_member());
-- Explicit grants: anonymous cannot access any application tables.
revoke all on public.app_members, public.listings, public.market_metrics, public.ingestion_runs from anon;
grant select on public.app_members, public.market_metrics, public.ingestion_runs to authenticated;
grant select,insert,update,delete on public.listings to authenticated;
grant all on public.market_metrics,public.ingestion_runs to service_role;
grant usage,select on sequence public.ingestion_runs_id_seq to service_role;
-- After creating your account, authorize its UUID:
-- insert into public.app_members(user_id) values ('YOUR_AUTH_USER_UUID');
