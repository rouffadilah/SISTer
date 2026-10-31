-- SISTer: keamanan baca data sekolah dan persetujuan pendaftaran.
-- Jalankan setelah tabel dasar dan role sekolah sudah dibuat.
-- RLS tetap aktif; jangan gunakan service_role key di browser.

create or replace function public.is_school_admin(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships sm
    join public.membership_roles mr
      on mr.membership_id = sm.id and mr.school_id = sm.school_id
    join public.roles r on r.id = mr.role_id
    where sm.user_id = auth.uid()
      and sm.school_id = p_school_id
      and sm.status = 'active'
      and r.code = 'school_admin'
  );
$$;

revoke all on function public.is_school_admin(uuid) from public;
grant execute on function public.is_school_admin(uuid) to authenticated;

-- Hak SELECT tingkat tabel dibutuhkan sebelum kebijakan RLS dapat memfilter baris.
grant select on table public.schools, public.school_memberships,
  public.membership_roles, public.roles, public.profiles to authenticated;
grant update (full_name, phone, avatar_url, updated_at) on table public.profiles to authenticated;


-- Pastikan RLS aktif di tabel yang menyimpan data pengguna dan keanggotaan.
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.roles enable row level security;
alter table public.membership_roles enable row level security;

-- Pengguna hanya dapat membaca dan memperbarui profilnya sendiri.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists memberships_select_own on public.school_memberships;
create policy memberships_select_own on public.school_memberships
for select to authenticated using (user_id = auth.uid());

drop policy if exists memberships_insert_own_pending on public.school_memberships;
create policy memberships_insert_own_pending on public.school_memberships
for insert to authenticated with check (user_id = auth.uid() and status = 'pending');

drop policy if exists membership_roles_select_own on public.membership_roles;
create policy membership_roles_select_own on public.membership_roles
for select to authenticated using (exists (
  select 1 from public.school_memberships sm
  where sm.id = membership_roles.membership_id and sm.user_id = auth.uid()
));

-- Administrator dapat membaca anggota pada sekolah yang dikelolanya.
drop policy if exists memberships_select_school_admin on public.school_memberships;
create policy memberships_select_school_admin
on public.school_memberships for select to authenticated
using (public.is_school_admin(school_id));

drop policy if exists profiles_select_school_admin on public.profiles;
create policy profiles_select_school_admin
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.user_id = profiles.id
      and sm.status in ('active', 'pending', 'rejected')
      and public.is_school_admin(sm.school_id)
  )
);

drop policy if exists membership_roles_select_school_admin on public.membership_roles;
create policy membership_roles_select_school_admin
on public.membership_roles for select to authenticated
using (public.is_school_admin(school_id));

-- Hak baca sekolah sendiri dan role katalog untuk akun terautentikasi.
drop policy if exists schools_select_active_membership on public.schools;
create policy schools_select_active_membership
on public.schools for select to authenticated
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = schools.id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  )
);

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
on public.roles for select to authenticated using (true);

-- Fungsi RPC memeriksa peran admin di database, bukan hanya di antarmuka web.
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
  where sm.id = p_membership_id and sm.status = 'pending';

  if v_school_id is null then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses';
  end if;
  if not public.is_school_admin(v_school_id) then
    raise exception 'Hanya Admin Sekolah yang dapat memproses permintaan';
  end if;

  if p_action = 'reject' then
    update public.school_memberships
      set status = 'rejected'
      where id = p_membership_id and status = 'pending';
    return;
  end if;

  -- Peran istimewa tidak dapat diberikan lewat permintaan pendaftaran publik.
  if v_requested_role not in (
    'teacher', 'student', 'staff', 'principal', 'vice_principal',
    'homeroom_teacher', 'counselor', 'parent'
  ) then
    raise exception 'Peran yang diminta tidak diizinkan';
  end if;

  select r.id into v_role_id
  from public.roles r where r.code = v_requested_role limit 1;
  if v_role_id is null then
    raise exception 'Kode peran belum tersedia di tabel roles';
  end if;

  update public.school_memberships
    set status = 'active'
    where id = p_membership_id and status = 'pending';

  insert into public.membership_roles (membership_id, school_id, role_id)
  values (p_membership_id, v_school_id, v_role_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.admin_review_membership(uuid, text) from public;
grant execute on function public.admin_review_membership(uuid, text) to authenticated;
