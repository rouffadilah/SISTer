import type { createClient } from "@/lib/supabase/server";
import { STAFF_ROLE_CODES } from "@/lib/sister/viewer";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Tahun ajaran berjalan: Juli–Desember → "2026/2027", Januari–Juni → "2025/2026". */
export function currentAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export function isAcademicYear(value: string) {
  const match = /^(\d{4})\/(\d{4})$/.exec(value);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

export const gradeOptions = [
  { value: 10, label: "X" },
  { value: 11, label: "XI" },
  { value: 12, label: "XII" },
];

export function gradeLabel(grade: number) {
  return gradeOptions.find((g) => g.value === grade)?.label ?? String(grade);
}

/** Pesan ramah bila tabel kelas/siswa belum dibuat di Supabase. */
export function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "")));
}

/** Nama lengkap untuk sejumlah keanggotaan (dari tabel profiles). */
export async function getMemberNames(supabase: Supabase, membershipIds: string[]) {
  const names = new Map<string, string>();
  const ids = [...new Set(membershipIds.filter(Boolean))];
  if (!ids.length) return names;
  const { data: memberships } = await supabase.from("school_memberships").select("id, user_id").in("id", ids);
  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (!userIds.length) return names;
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
  const byUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Tanpa nama"]));
  for (const m of memberships ?? []) names.set(m.id, byUser.get(m.user_id) ?? "Tanpa nama");
  return names;
}

/** Nama wali kelas semua kelas di sekolah (lewat fungsi aman, juga untuk guru non-admin). */
export async function getHomeroomNames(supabase: Supabase, schoolId: string) {
  const { data } = await supabase.rpc("sister_homeroom_names", { p_school_id: schoolId });
  return new Map<string, string>(((data ?? []) as { membership_id: string; full_name: string }[]).map((r) => [r.membership_id, r.full_name]));
}

/** Pilihan wali kelas: anggota aktif yang berperan guru/staf. */
export async function getTeacherOptions(supabase: Supabase, schoolId: string) {
  const { data: memberships } = await supabase.from("school_memberships").select("id, user_id").eq("school_id", schoolId).eq("status", "active");
  const ids = (memberships ?? []).map((m) => m.id);
  if (!ids.length) return [];
  const { data: links } = await supabase.from("membership_roles").select("membership_id, role_id").in("membership_id", ids);
  const roleIds = [...new Set((links ?? []).map((l) => l.role_id))];
  const { data: roles } = roleIds.length ? await supabase.from("roles").select("id, code").in("id", roleIds) : { data: [] };
  const staffRoleIds = new Set((roles ?? []).filter((r) => STAFF_ROLE_CODES.includes(r.code)).map((r) => r.id));
  const staffIds = [...new Set((links ?? []).filter((l) => staffRoleIds.has(l.role_id)).map((l) => l.membership_id))];
  const names = await getMemberNames(supabase, staffIds);
  return staffIds.map((id) => ({ id, name: names.get(id) ?? "Tanpa nama" })).sort((a, b) => a.name.localeCompare(b.name, "id"));
}
