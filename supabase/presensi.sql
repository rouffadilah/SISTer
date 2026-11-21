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
  created_at timestamptz not null default now(),
  unique (school_id, class_id, attendance_date)
);

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

grant select, insert on public.attendance_sessions to authenticated;
grant select, insert, update on public.attendance_records to authenticated;

drop policy if exists attendance_sessions_select_manager on public.attendance_sessions;
create policy attendance_sessions_select_manager
on public.attendance_sessions for select to authenticated
using (public.sister_can_manage_attendance(school_id, class_id));

drop policy if exists attendance_sessions_insert_manager on public.attendance_sessions;
create policy attendance_sessions_insert_manager
on public.attendance_sessions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.sister_can_manage_attendance(school_id, class_id)
);

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
create policy attendance_records_insert_manager
on public.attendance_records for insert to authenticated
with check (
  exists (
    select 1
    from public.attendance_sessions s
    join public.students st
      on st.id = attendance_records.student_id
      and st.school_id = s.school_id
      and st.class_id = s.class_id
      and st.status = 'active'
    where s.id = attendance_records.session_id
      and s.school_id = attendance_records.school_id
      and public.sister_can_manage_attendance(s.school_id, s.class_id)
  )
);

drop policy if exists attendance_records_update_manager on public.attendance_records;
create policy attendance_records_update_manager
on public.attendance_records for update to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions s
    where s.id = attendance_records.session_id
      and s.school_id = attendance_records.school_id
      and public.sister_can_manage_attendance(s.school_id, s.class_id)
  )
)
with check (
  exists (
    select 1
    from public.attendance_sessions s
    where s.id = attendance_records.session_id
      and s.school_id = attendance_records.school_id
      and public.sister_can_manage_attendance(s.school_id, s.class_id)
  )
  and (
    attendance_records.student_id is null
    or exists (
      select 1
      from public.students st
      join public.attendance_sessions s on s.id = attendance_records.session_id
      where st.id = attendance_records.student_id
        and st.school_id = attendance_records.school_id
        and st.class_id = s.class_id
        and st.status = 'active'
    )
  )
);

commit;
