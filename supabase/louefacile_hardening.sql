-- LoueFacile hardening migration
-- Execute this AFTER your current schema script.
-- Goals:
-- 1) align `profiles` with app auth fields
-- 2) harden RLS and ownership checks
-- 3) make pass/unlock flows safer and atomic
-- 4) make trigger-side writes work reliably with security definer

-- =====================================================
-- 0) Shared trigger function
-- =====================================================
create or replace function public.set_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =====================================================
-- 1) Profiles alignment for current frontend
-- =====================================================
alter table if exists public.profiles
  add column if not exists has_active_pass boolean not null default false,
  add column if not exists pass_expiry timestamptz,
  add column if not exists daily_views_left integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if to_regclass('public.profiles') is not null then
    begin
      alter table public.profiles
        add constraint profiles_daily_views_left_check check (daily_views_left >= 0);
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists trg_profiles_updated_at on public.profiles';
    execute 'create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at_column()';
  end if;
end $$;

-- Lock down profile read/write to owner only.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "Public profiles are viewable by everyone." on public.profiles';
    execute 'drop policy if exists "Users can insert their own profile." on public.profiles';
    execute 'drop policy if exists "Users can update own profile." on public.profiles';
    execute 'drop policy if exists "Profiles select own" on public.profiles';
    execute 'drop policy if exists "Profiles insert own" on public.profiles';
    execute 'drop policy if exists "Profiles update own" on public.profiles';

    execute 'create policy "Profiles select own" on public.profiles for select using (auth.uid() = id)';
    execute 'create policy "Profiles insert own" on public.profiles for insert with check (auth.uid() = id)';
    execute 'create policy "Profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';
  end if;
end $$;

-- Ensure signup trigger fills profile name from either `name` or `full_name`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Utilisateur'),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user()';
end $$;

-- =====================================================
-- 2) Properties / bookings / favorites RLS hardening
-- =====================================================
do $$
begin
  if to_regclass('public.properties') is not null then
    execute 'drop policy if exists "Users can update their own properties." on public.properties';
    execute 'create policy "Users can update their own properties." on public.properties for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';
  end if;
end $$;

-- Optional helper indexes
do $$
begin
  if to_regclass('public.properties') is not null then
    execute 'create index if not exists idx_properties_owner on public.properties(owner_id)';
  end if;
  if to_regclass('public.bookings') is not null then
    execute 'create index if not exists idx_bookings_user on public.bookings(user_id)';
    execute 'create index if not exists idx_bookings_property on public.bookings(property_id)';
  end if;
  if to_regclass('public.favorites') is not null then
    execute 'create index if not exists idx_favorites_user on public.favorites(user_id)';
  end if;
end $$;

-- =====================================================
-- 3) Passes and unlocks hardening
-- =====================================================
do $$
begin
  if to_regclass('public.search_passes') is not null then
    alter table public.search_passes
      add column if not exists updated_at timestamptz default now();

    drop trigger if exists update_search_passes_updated_at on public.search_passes;
    create trigger update_search_passes_updated_at
    before update on public.search_passes
    for each row
    execute function public.set_updated_at_column();

    execute 'drop policy if exists "Users can insert their own passes" on public.search_passes';
    execute 'create policy "Users can insert their own passes" on public.search_passes for insert with check (auth.uid() = user_id)';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'search_passes'
        and policyname = 'Users can update their own active pass metadata'
    ) then
      execute 'create policy "Users can update their own active pass metadata" on public.search_passes for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.property_unlocks') is not null then
    execute 'drop policy if exists "Users can create unlocks" on public.property_unlocks';
    execute 'create policy "Users can create unlocks" on public.property_unlocks for insert with check (
      auth.uid() = user_id and exists (
        select 1 from public.search_passes sp
        where sp.id = pass_id and sp.user_id = auth.uid()
      )
    )';
  end if;
end $$;

-- Atomic unlock function (queue-safe, daily limit = 2)
create or replace function public.unlock_property(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pass_id uuid;
  v_unlocks_today integer := 0;
  v_last_unlock_date date;
  v_daily_limit integer := 2;
  v_exists boolean := false;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_property_id is null then
    raise exception 'PROPERTY_REQUIRED';
  end if;

  if not exists (select 1 from public.properties where id = p_property_id) then
    raise exception 'PROPERTY_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text || ':' || p_property_id::text));

  select exists(
    select 1
    from public.property_unlocks pu
    where pu.user_id = v_user_id
      and pu.property_id = p_property_id
  )
  into v_exists;

  if v_exists then
    return jsonb_build_object(
      'ok', true,
      'already_unlocked', true
    );
  end if;

  select sp.id, coalesce(sp.unlocks_today, 0), sp.last_unlock_date
  into v_pass_id, v_unlocks_today, v_last_unlock_date
  from public.search_passes sp
  where sp.user_id = v_user_id
    and sp.status = 'active'
    and sp.end_date > now()
  order by sp.end_date desc
  limit 1
  for update;

  if v_pass_id is null then
    raise exception 'NO_ACTIVE_PASS';
  end if;

  if v_last_unlock_date is distinct from current_date then
    v_unlocks_today := 0;
    update public.search_passes
    set unlocks_today = 0,
        last_unlock_date = current_date,
        updated_at = now()
    where id = v_pass_id;
  end if;

  if v_unlocks_today >= v_daily_limit then
    raise exception 'DAILY_LIMIT_REACHED';
  end if;

  insert into public.property_unlocks (pass_id, property_id, user_id)
  values (v_pass_id, p_property_id, v_user_id)
  on conflict do nothing;

  update public.search_passes
  set unlocks_today = coalesce(unlocks_today, 0) + 1,
      last_unlock_date = current_date,
      updated_at = now()
  where id = v_pass_id
  returning unlocks_today into v_unlocks_today;

  return jsonb_build_object(
    'ok', true,
    'already_unlocked', false,
    'pass_id', v_pass_id,
    'remaining_today', greatest(v_daily_limit - v_unlocks_today, 0)
  );
end;
$$;

revoke all on function public.unlock_property(uuid) from public;
grant execute on function public.unlock_property(uuid) to authenticated;

-- Keep profile pass summary synced for current frontend fields.
create or replace function public.refresh_profile_pass_summary(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end_date timestamptz;
  v_unlocks_today integer := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select sp.end_date, coalesce(sp.unlocks_today, 0)
  into v_end_date, v_unlocks_today
  from public.search_passes sp
  where sp.user_id = p_user_id
    and sp.status = 'active'
    and sp.end_date > now()
  order by sp.end_date desc
  limit 1;

  if v_end_date is null then
    update public.profiles
    set has_active_pass = false,
        pass_expiry = null,
        daily_views_left = 0,
        updated_at = timezone('utc', now())
    where id = p_user_id;
  else
    if exists (
      select 1
      from public.search_passes sp
      where sp.id in (
        select id from public.search_passes
        where user_id = p_user_id
          and status = 'active'
          and end_date > now()
        order by end_date desc
        limit 1
      )
      and sp.last_unlock_date is distinct from current_date
    ) then
      v_unlocks_today := 0;
    end if;

    update public.profiles
    set has_active_pass = true,
        pass_expiry = v_end_date,
        daily_views_left = greatest(2 - v_unlocks_today, 0),
        updated_at = timezone('utc', now())
    where id = p_user_id;
  end if;
end;
$$;

create or replace function public.sync_profile_on_search_passes_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_profile_pass_summary(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

do $$
begin
  if to_regclass('public.search_passes') is not null then
    execute 'drop trigger if exists trg_sync_profile_on_search_passes_change on public.search_passes';
    execute 'create trigger trg_sync_profile_on_search_passes_change after insert or update or delete on public.search_passes for each row execute function public.sync_profile_on_search_passes_change()';
  end if;
end $$;

-- =====================================================
-- 4) Rental conclusion trigger functions hardened
-- =====================================================
create or replace function public.block_pass_on_conclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pass_owner uuid;
  v_pass_status text;
  v_pass_end timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select user_id, status, end_date
  into v_pass_owner, v_pass_status, v_pass_end
  from public.search_passes
  where id = new.pass_id
  for update;

  if v_pass_owner is null then
    raise exception 'PASS_NOT_FOUND';
  end if;

  if v_pass_owner <> v_user_id or new.user_id <> v_user_id then
    raise exception 'PASS_OWNERSHIP_MISMATCH';
  end if;

  if v_pass_status <> 'active' or v_pass_end <= now() then
    raise exception 'PASS_NOT_ACTIVE';
  end if;

  update public.search_passes
  set status = 'blocked',
      blocked_reason = 'Chambre prise - en attente de confirmation',
      updated_at = now()
  where id = new.pass_id;

  update public.properties
  set status = 'en_confirmation',
      status_updated_at = now(),
      status_updated_by = new.user_id
  where id = new.property_id;

  new.confirmation_deadline := coalesce(new.payment_date, now()) + interval '24 hours';
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.rental_conclusions') is not null then
    execute 'drop trigger if exists block_pass_on_rental_conclusion on public.rental_conclusions';
    execute 'create trigger block_pass_on_rental_conclusion before insert on public.rental_conclusions for each row execute function public.block_pass_on_conclusion()';
  end if;
end $$;

create or replace function public.update_property_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and old.status = 'pending' then
    update public.properties
    set status = 'louee',
        status_updated_at = now(),
        status_updated_by = new.confirmed_by
    where id = new.property_id;

  elsif new.status in ('rejected', 'cancelled') and old.status = 'pending' then
    update public.properties
    set status = 'disponible',
        status_updated_at = now(),
        status_updated_by = new.confirmed_by
    where id = new.property_id;

    update public.search_passes
    set status = case when end_date > now() then 'active' else 'expired' end,
        blocked_reason = null,
        updated_at = now()
    where id = new.pass_id;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.rental_conclusions') is not null then
    execute 'drop trigger if exists update_property_status_on_confirmation on public.rental_conclusions';
    execute 'create trigger update_property_status_on_confirmation after update on public.rental_conclusions for each row when (old.status is distinct from new.status) execute function public.update_property_on_confirmation()';
  end if;
end $$;

-- =====================================================
-- 5) Agent notifications: trigger-side insert reliability
-- =====================================================
create or replace function public.notify_agent_on_rental_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_property_title text;
  v_user_name text;
begin
  select owner_id, title
  into v_agent_id, v_property_title
  from public.properties
  where id = new.property_id;

  if v_agent_id is null then
    return new;
  end if;

  select coalesce(p.full_name, u.email)
  into v_user_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = new.user_id;

  insert into public.agent_notifications (
    agent_id,
    type,
    property_id,
    conclusion_id,
    title,
    message,
    priority
  ) values (
    v_agent_id,
    'rental_request',
    new.property_id,
    new.id,
    'Nouvelle demande de location',
    format(
      'Le locataire %s souhaite louer "%s". Paiement recu: %s FCFA. Vous avez 24h pour confirmer.',
      coalesce(v_user_name, 'Locataire'),
      coalesce(v_property_title, 'Bien'),
      new.amount
    ),
    'high'
  );

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.rental_conclusions') is not null then
    execute 'drop trigger if exists notify_agent_on_new_rental_request on public.rental_conclusions';
    execute 'create trigger notify_agent_on_new_rental_request after insert on public.rental_conclusions for each row execute function public.notify_agent_on_rental_request()';
  end if;
end $$;

-- =====================================================
-- 6) Guard rails note
-- =====================================================
-- IMPORTANT:
-- Do not keep or execute "TRUNCATE all public tables" blocks in production migrations.
