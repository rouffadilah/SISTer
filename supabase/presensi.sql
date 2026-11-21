begin;

create or replace function public.sister_can_manage_attendance(p_school_id uuid, p_class_id uuid)
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
      on mr.membership_id = m.id
      and mr.school_id = m.school_id
    join public.roles r on r.id = mr.role_id
    join public.classes c
      on c.id = p_class_id
      and c.school_id = p_school_id
    where m.user_id = (select auth.uid())
      and m.school_id = p_school_id
      and m.status = 'active'
      and (
        r.code = 'school_admin'
        or (
          r.code in ('teacher', 'homeroom_teacher')
          and c.homeroom_membership_id = m.id
        )
      )
  );
$$;

revoke all on function public.sister_can_manage_attendance(uuid, uuid) from public, anon;
grant execute on function public.sister_can_manage_attendance(uuid, uuid) to authenticated;

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  attendance_date date not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  unique (school_id, class_id, attendance_date)
);

alter table public.attendance_sessions
  add column if not exists revision integer not null default 0;

create index if not exists attendance_sessions_class_date_idx
  on public.attendance_sessions (school_id, class_id, attendance_date desc);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete restrict,
  student_name text not null check (char_length(btrim(student_name)) between 1 and 120),
  status text not null check (status in ('present', 'late', 'sick', 'permission', 'absent')),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists attendance_records_school_student_idx
  on public.attendance_records (school_id, student_id);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

revoke all on table public.attendance_sessions from anon, authenticated;
revoke all on table public.attendance_records from anon, authenticated;
grant select on public.attendance_sessions to authenticated;
grant select on public.attendance_records to authenticated;

drop policy if exists attendance_sessions_select_manager on public.attendance_sessions;
create policy attendance_sessions_select_manager
on public.attendance_sessions for select to authenticated
using (public.sister_can_manage_attendance(school_id, class_id));

drop policy if exists attendance_sessions_insert_manager on public.attendance_sessions;

drop policy if exists attendance_records_select_manager on public.attendance_records;
create policy attendance_records_select_manager
on public.attendance_records for select to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions s
    where s.id = attendance_records.session_id
      and s.school_id = attendance_records.school_id
      and public.sister_can_manage_attendance(s.school_id, s.class_id)
  )
);

drop policy if exists attendance_records_insert_manager on public.attendance_records;
drop policy if exists attendance_records_update_manager on public.attendance_records;

create or replace function public.sister_save_attendance(
  p_school_id uuid,
  p_class_id uuid,
  p_attendance_date date,
  p_expected_revision integer,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_revision integer;
  v_class_id uuid;
  v_student record;
  v_entry jsonb;
  v_student_id uuid;
  v_student_name text;
  v_record_id uuid;
  v_existing_record_id uuid;
  v_record_id_text text;
  v_student_id_text text;
  v_status text;
  v_active_count integer := 0;
begin
  if auth.uid() is null
    or p_school_id is null
    or p_class_id is null
    or p_attendance_date is null
    or p_expected_revision is null
    or p_expected_revision < 0
    or jsonb_typeof(p_entries) is distinct from 'array'
  then
    raise exception 'Invalid attendance request' using errcode = '22023';
  end if;

  if not public.sister_can_manage_attendance(p_school_id, p_class_id) then
    raise exception 'Not authorized to manage attendance' using errcode = '42501';
  end if;

  select c.id into v_class_id
  from public.classes c
  where c.id = p_class_id
    and c.school_id = p_school_id
  for update;

  if not found then
    raise exception 'Class not found' using errcode = '42501';
  end if;

  insert into public.attendance_sessions (school_id, class_id, attendance_date, created_by)
  values (p_school_id, p_class_id, p_attendance_date, auth.uid())
  on conflict (school_id, class_id, attendance_date) do nothing;

  select s.id, s.revision into v_session_id, v_revision
  from public.attendance_sessions s
  where s.school_id = p_school_id
    and s.class_id = p_class_id
    and s.attendance_date = p_attendance_date
  for update;

  if not found then
    raise exception 'Attendance session could not be loaded' using errcode = 'P0001';
  end if;

  if v_revision <> p_expected_revision then
    raise exception 'Attendance changed; reload before saving' using errcode = '40001';
  end if;

  if jsonb_array_length(p_entries) > 1000 then
    raise exception 'Attendance submission is too large' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as item(value)
    where jsonb_typeof(value) is distinct from 'object'
  ) then
    raise exception 'Attendance entries must be objects' using errcode = '22023';
  end if;

  if exists (
    select value->>'student_id'
    from jsonb_array_elements(p_entries) as item(value)
    where nullif(value->>'student_id', '') is not null
    group by value->>'student_id'
    having count(*) > 1
  ) or exists (
    select value->>'record_id'
    from jsonb_array_elements(p_entries) as item(value)
    where nullif(value->>'record_id', '') is not null
    group by value->>'record_id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate attendance entries are not allowed' using errcode = '22023';
  end if;

  for v_student in
    select st.id, st.full_name
    from public.students st
    where st.school_id = p_school_id
      and st.class_id = p_class_id
      and st.status = 'active'
    order by st.id
    for key share
  loop
    v_active_count := v_active_count + 1;
    if v_active_count > 500 then
      raise exception 'Class exceeds the attendance student limit' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(p_entries) as item(value)
      where value->>'student_id' = v_student.id::text
        and nullif(value->>'record_id', '') is null
    ) then
      raise exception 'Roster changed; reload before saving' using errcode = '40001';
    end if;
  end loop;

  if exists (
    select 1
    from public.attendance_records ar
    where ar.session_id = v_session_id
      and ar.school_id = p_school_id
      and not exists (
        select 1
        from jsonb_array_elements(p_entries) as item(value)
        where value->>'record_id' = ar.id::text
          or (ar.student_id is not null and value->>'student_id' = ar.student_id::text)
      )
  ) then
    raise exception 'Attendance roster changed; reload before saving' using errcode = '40001';
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries) as item(value)
  loop
    v_record_id_text := nullif(v_entry->>'record_id', '');
    v_student_id_text := nullif(v_entry->>'student_id', '');
    v_status := v_entry->>'status';

    if v_status is null or v_status not in ('present', 'late', 'sick', 'permission', 'absent') then
      raise exception 'Invalid attendance status' using errcode = '22023';
    end if;

    if v_record_id_text is not null then
      if v_student_id_text is not null then
        raise exception 'Historical entries cannot change student associations' using errcode = '22023';
      end if;
      v_record_id := v_record_id_text::uuid;
      select ar.id into v_existing_record_id
      from public.attendance_records ar
      where ar.id = v_record_id
        and ar.session_id = v_session_id
        and ar.school_id = p_school_id
      for update;
      if not found then
        raise exception 'Attendance record not found in this session' using errcode = '42501';
      end if;
      update public.attendance_records
      set status = v_status
      where id = v_record_id;
    else
      if v_student_id_text is null then
        raise exception 'Student or historical record is required' using errcode = '22023';
      end if;
      v_student_id := v_student_id_text::uuid;
      select st.full_name into v_student_name
      from public.students st
      where st.id = v_student_id
        and st.school_id = p_school_id
        and st.class_id = p_class_id
        and st.status = 'active'
      for key share;
      if not found then
        raise exception 'Roster changed; reload before saving' using errcode = '40001';
      end if;

      select ar.id into v_existing_record_id
      from public.attendance_records ar
      where ar.session_id = v_session_id
        and ar.student_id = v_student_id
      for update;
      if found then
        update public.attendance_records
        set status = v_status
        where id = v_existing_record_id;
      else
        insert into public.attendance_records (
          session_id, student_id, school_id, student_name, status
        )
        values (
          v_session_id, v_student_id, p_school_id, v_student_name, v_status
        );
      end if;
    end if;
  end loop;

  update public.attendance_sessions
  set revision = revision + 1
  where id = v_session_id
  returning revision into v_revision;

  return v_revision;
end;
$$;

revoke all on function public.sister_save_attendance(uuid, uuid, date, integer, jsonb) from public, anon;
grant execute on function public.sister_save_attendance(uuid, uuid, date, integer, jsonb) to authenticated;

commit;
