-- SISTer: pendaftaran mandiri dengan persetujuan administrator.
-- Jalankan di Supabase SQL Editor setelah memastikan nama tabel/kolom sesuai skema project.

-- Izin SQL diperlukan selain policy RLS. RLS tetap aktif dan membatasi baris yang terbaca.
grant select on public.schools, public.school_memberships, public.profiles,
  public.membership_roles, public.roles to authenticated;
revoke insert on public.school_memberships from authenticated;

drop policy if exists schools_select_for_registration on public.schools;
create policy schools_select_for_registration on public.schools
  for select to authenticated using (true);

drop policy if exists memberships_select_own on public.school_memberships;
create policy memberships_select_own on public.school_memberships
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists memberships_insert_own_pending on public.school_memberships;

-- Trigger tepercaya membuat profil dan permintaan keanggotaan saat akun Auth dibuat.
-- Role yang dipilih pengguna hanya menjadi requested_role, bukan role aktif.
create or replace function public.sister_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_full_name text;
  v_requested_role text;
begin
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Pengguna');
  v_requested_role := new.raw_user_meta_data ->> 'requested_role';
  if v_requested_role not in ('teacher','student','staff','principal','parent','homeroom_teacher','counselor','finance') then
    v_requested_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email)
  values (new.id, v_full_name, new.email)
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

  select id into v_school_id from public.schools where slug = 'sma-islam-cikal-harapan-1' limit 1;
  if v_school_id is not null then
    insert into public.school_memberships (school_id, user_id, status, requested_role)
    values (v_school_id, new.id, 'pending', v_requested_role)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.sister_handle_new_user();

-- Fungsi persetujuan: hanya school_admin aktif yang dapat menyetujui permintaan.
create or replace function public.sister_approve_membership(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_requested_role text;
  v_role_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  if not exists (
    select 1
    from public.school_memberships admin_m
    join public.membership_roles mr on mr.membership_id = admin_m.id and mr.school_id = admin_m.school_id
    join public.roles r on r.id = mr.role_id
    where admin_m.user_id = auth.uid() and admin_m.status = 'active' and r.code = 'school_admin'
  ) then raise exception 'Only active school administrators can approve membership'; end if;

  select school_id, requested_role into v_school_id, v_requested_role
  from public.school_memberships where id = p_membership_id and status = 'pending';
  if v_school_id is null then raise exception 'Pending membership not found'; end if;

  select id into v_role_id from public.roles where code = v_requested_role limit 1;
  if v_role_id is null or v_requested_role = 'school_admin' or v_requested_role = 'it_admin' then
    raise exception 'Requested role is not eligible for self-registration';
  end if;

  update public.school_memberships set status = 'active' where id = p_membership_id;
  insert into public.membership_roles (membership_id, school_id, role_id)
  values (p_membership_id, v_school_id, v_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.sister_approve_membership(uuid) from public;
grant execute on function public.sister_approve_membership(uuid) to authenticated;

-- Helper SECURITY DEFINER mencegah policy SELECT admin mengalami rekursi RLS.
create or replace function public.sister_is_school_admin(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.school_memberships m
    join public.membership_roles mr on mr.membership_id = m.id and mr.school_id = m.school_id
    join public.roles r on r.id = mr.role_id
    where m.user_id = auth.uid() and m.school_id = p_school_id
      and m.status = 'active' and r.code = 'school_admin'
  );
$$;
revoke all on function public.sister_is_school_admin(uuid) from public;
grant execute on function public.sister_is_school_admin(uuid) to authenticated;

drop policy if exists memberships_select_own_or_admin on public.school_memberships;
create policy memberships_select_own_or_admin on public.school_memberships
  for select to authenticated using (
    user_id = (select auth.uid()) or public.sister_is_school_admin(school_id)
  );

drop policy if exists profiles_select_own_or_school_admin on public.profiles;
create policy profiles_select_own_or_school_admin on public.profiles
  for select to authenticated using (
    id = (select auth.uid()) or exists (
      select 1 from public.school_memberships m
      where m.user_id = profiles.id and public.sister_is_school_admin(m.school_id)
    )
  );
