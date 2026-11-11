-- SISTer: satu alur pendaftaran dan persetujuan administrator.
-- Jalankan di Supabase SQL Editor setelah memeriksa skema tabel project.
-- Tabel yang dibutuhkan:
-- schools(id, slug, name), profiles(id, full_name, email),
-- school_memberships(id, school_id, user_id, status, requested_role, created_at),
-- roles(id, code, name), membership_roles(membership_id, school_id, role_id).
--
-- Catatan: migrasi ini tidak mengubah/menghapus data akun yang sudah ada.
-- Pastikan hanya ada satu trigger pendaftaran aktif setelah migrasi dijalankan.

begin;

-- Helper SECURITY DEFINER mencegah rekursi policy RLS dan membatasi admin
-- pada sekolah yang memang memiliki keanggotaan admin aktif.
create or replace function public.sister_is_school_admin(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships m
    join public.membership_roles mr
      on mr.membership_id = m.id and mr.school_id = m.school_id
    join public.roles r on r.id = mr.role_id
    where m.user_id = auth.uid()
      and m.school_id = p_school_id
      and m.status = 'active'
      and r.code = 'school_admin'
  );
$$;

revoke all on function public.sister_is_school_admin(uuid) from public, anon;
grant execute on function public.sister_is_school_admin(uuid) to authenticated;

-- Pastikan RLS aktif.
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.membership_roles enable row level security;

-- Hak tabel: RLS tetap menjadi pembatas baris.
grant select on public.schools, public.profiles, public.school_memberships,
  public.roles, public.membership_roles to authenticated;
grant update (full_name, phone, avatar_url, updated_at)
  on public.profiles to authenticated;
revoke insert, update, delete on public.school_memberships from anon, authenticated;
revoke insert, update, delete on public.membership_roles from anon, authenticated;

-- Profil hanya dapat dibaca pemiliknya dan admin sekolah terkait.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_school_admin on public.profiles;
drop policy if exists profiles_select_own_or_school_admin on public.profiles;
create policy profiles_select_own_or_school_admin on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.school_memberships m
    where m.user_id = profiles.id
      and m.status in ('pending', 'active', 'rejected')
      and public.sister_is_school_admin(m.school_id)
  )
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Anggota hanya dapat melihat keanggotaannya sendiri; admin dapat melihat
-- seluruh anggota sekolah yang dikelolanya.
drop policy if exists memberships_select_own on public.school_memberships;
drop policy if exists memberships_select_school_admin on public.school_memberships;
drop policy if exists memberships_select_own_or_admin on public.school_memberships;
create policy memberships_select_own_or_admin on public.school_memberships
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.sister_is_school_admin(school_id)
);

drop policy if exists schools_select_active_membership on public.schools;
drop policy if exists schools_select_for_registration on public.schools;
drop policy if exists schools_select_authenticated on public.schools;
create policy schools_select_authenticated on public.schools
for select to authenticated using (true);

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
for select to authenticated using (true);

drop policy if exists membership_roles_select_own on public.membership_roles;
drop policy if exists membership_roles_select_school_admin on public.membership_roles;
drop policy if exists membership_roles_select_own_or_admin on public.membership_roles;
create policy membership_roles_select_own_or_admin on public.membership_roles
for select to authenticated
using (
  exists (
    select 1 from public.school_memberships m
    where m.id = membership_roles.membership_id
      and m.user_id = (select auth.uid())
  )
  or public.sister_is_school_admin(school_id)
);

-- Trigger tunggal: membuat profil dan keanggotaan pending dari metadata Auth.
-- Role khusus (school_admin/it_admin/finance) tidak dapat diminta melalui publik.
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
  v_slug text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pengguna'
  );
  v_requested_role := new.raw_user_meta_data ->> 'requested_role';
  v_slug := new.raw_user_meta_data ->> 'school_slug';

  if v_requested_role not in (
    'teacher', 'student', 'staff', 'principal', 'vice_principal',
    'homeroom_teacher', 'counselor', 'parent'
  ) then
    v_requested_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email)
  values (new.id, v_full_name, new.email)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  select s.id into v_school_id
  from public.schools s
  where s.slug = v_slug
  limit 1;

  if v_school_id is null then
    raise warning 'SISTer: school slug "%" tidak ditemukan untuk user %', v_slug, new.id;
    return new;
  end if;

  insert into public.school_memberships (school_id, user_id, status, requested_role)
  values (v_school_id, new.id, 'pending', v_requested_role)
  on conflict do nothing;

  return new;
end;
$$;

-- Hapus kedua nama trigger lama yang pernah dipakai, lalu pasang satu trigger.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_created_membership on auth.users;
create trigger sister_on_auth_user_created
after insert on auth.users
for each row execute function public.sister_handle_new_user();

-- Satu RPC untuk SETUJUI maupun TOLAK.
-- Hak admin diperiksa di database dan sekolah target diperiksa secara spesifik.
create or replace function public.admin_review_membership(
  p_membership_id uuid,
  p_action text
)
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
  if auth.uid() is null then
    raise exception 'Autentikasi diperlukan';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'Tindakan tidak valid';
  end if;

  select sm.school_id, sm.requested_role
    into v_school_id, v_requested_role
  from public.school_memberships sm
  where sm.id = p_membership_id
    and sm.status = 'pending'
  for update;

  if v_school_id is null then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses';
  end if;

  if not public.sister_is_school_admin(v_school_id) then
    raise exception 'Hanya Admin Sekolah terkait yang dapat memproses permintaan';
  end if;

  if p_action = 'reject' then
    update public.school_memberships
      set status = 'rejected'
      where id = p_membership_id and status = 'pending';
    return;
  end if;

  if v_requested_role not in (
    'teacher', 'student', 'staff', 'principal', 'vice_principal',
    'homeroom_teacher', 'counselor', 'parent'
  ) then
    raise exception 'Peran yang diminta tidak diizinkan melalui pendaftaran publik';
  end if;

  select r.id into v_role_id
  from public.roles r
  where r.code = v_requested_role
  limit 1;

  if v_role_id is null then
    raise exception 'Kode peran "%" belum tersedia di tabel roles', v_requested_role;
  end if;

  update public.school_memberships
    set status = 'active'
    where id = p_membership_id and status = 'pending';

  insert into public.membership_roles (membership_id, school_id, role_id)
  values (p_membership_id, v_school_id, v_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.admin_review_membership(uuid, text) from public, anon;
grant execute on function public.admin_review_membership(uuid, text) to authenticated;

-- Alias kompatibilitas bagi instalasi lama; implementasi tetap satu sumber.
create or replace function public.sister_approve_membership(p_membership_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.admin_review_membership(p_membership_id, 'approve');
$$;

revoke all on function public.sister_approve_membership(uuid) from public, anon;
grant execute on function public.sister_approve_membership(uuid) to authenticated;

commit;
