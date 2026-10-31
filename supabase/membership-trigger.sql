-- SISTer: trigger profil dan pendaftaran keanggotaan.
-- Jalankan di Supabase SQL Editor sebagai project owner.
-- Prasyarat: public.profiles(id, full_name, email), public.schools(id, slug),
-- public.school_memberships(school_id, user_id, status, requested_role).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Pengguna'
    ),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_pending_school_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_requested_role text;
  v_school_slug text;
begin
  v_school_slug := new.raw_user_meta_data ->> 'school_slug';
  v_requested_role := new.raw_user_meta_data ->> 'requested_role';

  -- Metadata pendaftaran hanya permintaan, bukan pemberian hak akses.
  if v_requested_role not in (
    'teacher', 'student', 'staff', 'principal', 'vice_principal',
    'homeroom_teacher', 'counselor', 'parent'
  ) then
    v_requested_role := 'student';
  end if;

  select s.id into v_school_id
  from public.schools as s
  where s.slug = v_school_slug
  limit 1;

  if v_school_id is not null then
    insert into public.school_memberships (school_id, user_id, status, requested_role)
    values (v_school_id, new.id, 'pending', v_requested_role)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_membership on auth.users;
create trigger on_auth_user_created_membership
after insert on auth.users
for each row execute function public.create_pending_school_membership();
