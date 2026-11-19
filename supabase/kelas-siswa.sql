-- =====================================================================
-- SISTer · Data Kelas & Siswa
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (memakai IF NOT EXISTS / CREATE OR REPLACE).
--
-- Mengasumsikan tabel yang sudah ada:
--   schools(id uuid), school_memberships(id uuid, school_id, user_id, status),
--   membership_roles(membership_id, role_id), roles(id, code)
-- =====================================================================


-- 1) Fungsi bantu hak akses -------------------------------------------
-- Dipakai oleh kebijakan RLS. SECURITY DEFINER agar bisa membaca tabel
-- keanggotaan tanpa terhalang RLS tabel tersebut.

create or replace function public.sister_is_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.sister_has_role(p_school_id uuid, p_codes text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_memberships m
    join public.membership_roles mr on mr.membership_id = m.id and mr.school_id = m.school_id
    join public.roles r on r.id = mr.role_id
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and r.code = any (p_codes)
  );
$$;

revoke all on function public.sister_is_member(uuid) from public, anon;
revoke all on function public.sister_has_role(uuid, text[]) from public, anon;
grant execute on function public.sister_is_member(uuid) to authenticated;
grant execute on function public.sister_has_role(uuid, text[]) to authenticated;


-- 2) Tabel kelas --------------------------------------------------------

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  academic_year text not null check (academic_year ~ '^[0-9]{4}/[0-9]{4}$'),
  grade smallint not null check (grade between 1 and 13),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  program text check (program is null or char_length(program) <= 60),
  homeroom_membership_id uuid references public.school_memberships (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (school_id, academic_year, name)
);

create index if not exists classes_school_year_idx on public.classes (school_id, academic_year);
create index if not exists classes_homeroom_idx on public.classes (homeroom_membership_id);


-- 3) Tabel siswa --------------------------------------------------------

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  membership_id uuid references public.school_memberships (id) on delete set null, -- akun siswa (bila sudah mendaftar)
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  nis text check (nis is null or char_length(nis) <= 30),
  nisn text check (nisn is null or char_length(nisn) <= 20),
  gender text check (gender in ('L', 'P')),
  status text not null default 'active' check (status in ('active', 'graduated', 'moved', 'inactive')),
  created_at timestamptz not null default now()
);

create unique index if not exists students_school_nis_key on public.students (school_id, nis) where nis is not null;
create unique index if not exists students_school_nisn_key on public.students (school_id, nisn) where nisn is not null;
create index if not exists students_school_idx on public.students (school_id);
create index if not exists students_class_idx on public.students (class_id);
create index if not exists students_membership_idx on public.students (membership_id);


-- 4) Hak akses (RLS) ----------------------------------------------------

alter table public.classes enable row level security;
alter table public.students enable row level security;

grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.students to authenticated;

-- Kelas: semua civitas aktif boleh melihat; hanya Admin Sekolah yang mengubah.
drop policy if exists classes_select_member on public.classes;
create policy classes_select_member on public.classes
  for select to authenticated
  using ((select public.sister_is_member(school_id)));

drop policy if exists classes_insert_admin on public.classes;
create policy classes_insert_admin on public.classes
  for insert to authenticated
  with check ((select public.sister_has_role(school_id, array['school_admin'])));

drop policy if exists classes_update_admin on public.classes;
create policy classes_update_admin on public.classes
  for update to authenticated
  using ((select public.sister_has_role(school_id, array['school_admin'])))
  with check ((select public.sister_has_role(school_id, array['school_admin'])));

drop policy if exists classes_delete_admin on public.classes;
create policy classes_delete_admin on public.classes
  for delete to authenticated
  using ((select public.sister_has_role(school_id, array['school_admin'])));

-- Siswa: guru/staf sekolah boleh melihat; siswa boleh melihat datanya sendiri;
-- hanya Admin Sekolah yang menambah/mengubah/menghapus.
drop policy if exists students_select_staff_or_self on public.students;
create policy students_select_staff_or_self on public.students
  for select to authenticated
  using (
    (select public.sister_has_role(
      school_id,
      array['school_admin', 'principal', 'vice_principal', 'teacher', 'homeroom_teacher', 'counselor', 'staff', 'it_admin']
    ))
    or membership_id in (
      select m.id from public.school_memberships m where m.user_id = (select auth.uid())
    )
  );

drop policy if exists students_insert_admin on public.students;
create policy students_insert_admin on public.students
  for insert to authenticated
  with check (
    (select public.sister_has_role(school_id, array['school_admin']))
    and (class_id is null or exists (
      select 1 from public.classes c where c.id = class_id and c.school_id = students.school_id
    ))
  );

drop policy if exists students_update_admin on public.students;
create policy students_update_admin on public.students
  for update to authenticated
  using ((select public.sister_has_role(school_id, array['school_admin'])))
  with check (
    (select public.sister_has_role(school_id, array['school_admin']))
    and (class_id is null or exists (
      select 1 from public.classes c where c.id = class_id and c.school_id = students.school_id
    ))
  );

drop policy if exists students_delete_admin on public.students;
create policy students_delete_admin on public.students
  for delete to authenticated
  using ((select public.sister_has_role(school_id, array['school_admin'])));


-- 5) Jumlah siswa aktif per kelas (mengikuti RLS pemanggil) ----------------

create or replace function public.sister_class_counts(p_school_id uuid)
returns table (class_id uuid, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.class_id, count(*)::bigint
  from public.students s
  where s.school_id = p_school_id
    and s.class_id is not null
    and s.status = 'active'
  group by s.class_id;
$$;

revoke all on function public.sister_class_counts(uuid) from public, anon;
grant execute on function public.sister_class_counts(uuid) to authenticated;


-- 6) Nama wali kelas untuk semua civitas aktif ---------------------------
-- Tabel profiles hanya bisa dibaca pemilik & admin (sister_security_migration.sql).
-- Fungsi ini hanya membuka NAMA wali kelas dari kelas di sekolah pemanggil.

create or replace function public.sister_homeroom_names(p_school_id uuid)
returns table (membership_id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.id, coalesce(nullif(btrim(p.full_name), ''), 'Tanpa nama')
  from public.classes c
  join public.school_memberships m on m.id = c.homeroom_membership_id
  left join public.profiles p on p.id = m.user_id
  where c.school_id = p_school_id
    and public.sister_is_member(p_school_id);
$$;

revoke all on function public.sister_homeroom_names(uuid) from public, anon;
grant execute on function public.sister_homeroom_names(uuid) to authenticated;
