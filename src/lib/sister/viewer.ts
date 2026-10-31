import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Nama peran yang ditampilkan ke pengguna, berdasarkan kode di tabel `roles`. */
export const roleLabels: Record<string, string> = {
  school_admin: "Admin Sekolah",
  principal: "Kepala Sekolah",
  vice_principal: "Wakil Kepala Sekolah",
  teacher: "Guru",
  homeroom_teacher: "Wali Kelas",
  counselor: "Guru BK",
  student: "Siswa",
  parent: "Orang Tua/Wali",
  staff: "Staf Sekolah",
  finance: "Keuangan",
  it_admin: "Admin IT",
};

export type Viewer = {
  id: string;
  email: string;
  name: string;
  /** Label peran, mis. ["Admin Sekolah"] */
  roles: string[];
  roleCodes: string[];
  isAdmin: boolean;
  schoolId: string | null;
  schoolName: string;
  /** false bila akun belum punya keanggotaan aktif (menunggu persetujuan) */
  hasAccess: boolean;
};

/**
 * Data pengguna yang sedang masuk, dipakai semua halaman di dalam aplikasi.
 * Mengalihkan ke halaman login bila belum masuk.
 */
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const metaName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const name = profile?.full_name || metaName || user.email || "Pengguna";

  const { data: memberships } = await supabase
    .from("school_memberships")
    .select("id, school_id, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  const roleCodes = new Set<string>();
  const roleNames = new Set<string>();
  let schoolId: string | null = null;
  let schoolName = "SMA Islam Cikal Harapan 1";

  for (const membership of memberships ?? []) {
    schoolId = membership.school_id;
    const { data: school } = await supabase.from("schools").select("name").eq("id", membership.school_id).maybeSingle();
    if (school?.name) schoolName = school.name;

    const { data: assignments } = await supabase
      .from("membership_roles")
      .select("role_id")
      .eq("membership_id", membership.id)
      .eq("school_id", membership.school_id);
    const roleIds = (assignments ?? []).map((item) => item.role_id);
    if (!roleIds.length) continue;

    const { data: roles } = await supabase.from("roles").select("code, name").in("id", roleIds);
    for (const role of roles ?? []) {
      roleCodes.add(role.code);
      roleNames.add(roleLabels[role.code] ?? role.name ?? role.code);
    }
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    roles: [...roleNames],
    roleCodes: [...roleCodes],
    isAdmin: roleCodes.has("school_admin"),
    schoolId,
    schoolName,
    hasAccess: Boolean(memberships?.length),
  };
}
