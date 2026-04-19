-- 1. Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  city text,
  zip text,
  family_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated using (auth.uid() = id);

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- 2. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Helper to fetch current user's family_id without recursion
create or replace function public.current_family_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

-- 4. Add exposure enum + columns to plants
create type public.plant_exposure as enum ('indoor', 'porch', 'outdoor');

alter table public.plants
  add column family_id text,
  add column exposure public.plant_exposure not null default 'indoor',
  add column rain_delay_until date;

create index plants_family_id_idx on public.plants(family_id);

-- Backfill exposure from existing location for existing rows
update public.plants set exposure = 'outdoor' where location = 'outdoor';
update public.plants set exposure = 'indoor' where location = 'indoor';

-- 5. Replace plants RLS to scope by family_id
drop policy if exists "Authenticated users can view plants" on public.plants;
drop policy if exists "Authenticated users can insert plants" on public.plants;
drop policy if exists "Authenticated users can update plants" on public.plants;
drop policy if exists "Authenticated users can delete plants" on public.plants;

create policy "Family members can view plants"
  on public.plants for select to authenticated
  using (family_id is not null and family_id = public.current_family_id());

create policy "Family members can insert plants"
  on public.plants for insert to authenticated
  with check (family_id is not null and family_id = public.current_family_id());

create policy "Family members can update plants"
  on public.plants for update to authenticated
  using (family_id is not null and family_id = public.current_family_id());

create policy "Family members can delete plants"
  on public.plants for delete to authenticated
  using (family_id is not null and family_id = public.current_family_id());