-- SISTer: kompatibilitas keamanan dan persetujuan administrator.
-- Untuk instalasi baru, gunakan supabase/sister_security_migration.sql.
-- File ini sengaja menjadi wrapper kompatibilitas agar tidak membuat
-- fungsi, policy, atau trigger dengan logika persetujuan kedua.

-- Helper lama dipertahankan sebagai alias yang mengarah ke pemeriksaan tunggal.
create or replace function public.is_school_admin(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.sister_is_school_admin(p_school_id);
$$;

revoke all on function public.is_school_admin(uuid) from public, anon;
grant execute on function public.is_school_admin(uuid) to authenticated;

-- Samakan nama RPC lama dan baru ke satu implementasi.
create or replace function public.admin_review_membership(
  p_membership_id uuid,
  p_action text
)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.admin_review_membership(p_membership_id, p_action);
$$;

-- Jangan jalankan file wrapper ini untuk mengganti migrasi utama.
-- Migrasi utama sister_security_migration.sql adalah satu-satunya sumber
-- definisi fungsi admin_review_membership dan kebijakan RLS.
