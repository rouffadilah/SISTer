-- SISTer: trigger tunggal untuk profil dan pendaftaran keanggotaan.
-- Jalankan setelah skema public.profiles, public.schools, dan
-- public.school_memberships tersedia.
-- Untuk instalasi baru gunakan supabase/sister_security_migration.sql
-- sebagai migrasi utama; file ini disediakan untuk proyek yang menerapkan
-- migrasi trigger secara terpisah.

create or replace function public.sister_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_requested_role text;
  v_school_slug text;
  v_full_name text;
begin
  v_school_slug := new.raw_user_meta_data ->> 'school_slug';
  v_requested_role := new.raw_user_meta_data ->> 'requested_role';
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pengguna'
  );

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
  where s.slug = v_school_slug
  limit 1;

  if v_school_id is not null then
    insert into public.school_memberships (school_id, user_id, status, requested_role)
    values (v_school_id, new.id, 'pending', v_requested_role)
    on conflict do nothing;
  else
    raise warning 'SISTer: school slug "%" tidak ditemukan untuk user %', v_school_slug, new.id;
  end if;

  return new;
end;
$$;

-- Hapus nama trigger versi sebelumnya agar tidak terjadi pendaftaran ganda.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_created_membership on auth.users;
drop trigger if exists sister_on_auth_user_created on auth.users;

create trigger sister_on_auth_user_created
after insert on auth.users
for each row execute function public.sister_handle_new_user();
