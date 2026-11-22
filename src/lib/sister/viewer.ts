import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Nama peran yang ditampilkan ke pengguna, berdasarkan kode di tabel roles. */
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

/** Peran yang termasuk guru/staf sekolah (boleh melihat data siswa). */
export const STAFF_ROLE_CODES = ["school_admin", "principal", "vice_principal", "teacher", "homeroom_teacher", "counselor", "staff", "it_admin"];

export type Viewer = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  roleCodes: string[];
  isAdmin: boolean;
  isStaff: boolean;
  schoolId: string | null;
  schoolName: string;
  hasAccess: boolean;
};

/** Data pengguna yang sedang masuk, dipakai semua halaman di dalam aplikasi. */
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("school_memberships")
      .select("id, school_id, status")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);
  const profile = profileResult.data;
  const memberships = membershipResult.data ?? [];
  const metaName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const name = profile?.full_name || metaName || user.email || "Pengguna";

  const schoolIds = [...new Set(memberships.map((membership) => membership.school_id))];
  const membershipIds = memberships.map((membership) => membership.id);
  const schools: { id: string; name: string }[] = [];
  const assignments: { membership_id: string; school_id: string; role_id: string }[] = [];

  if (schoolIds.length) {
    const [schoolResult, assignmentResult] = await Promise.all([
      supabase.from("schools").select("id, name").in("id", schoolIds),
      supabase
        .from("membership_roles")
        .select("membership_id, school_id, role_id")
        .in("membership_id", membershipIds)
        .in("school_id", schoolIds),
    ]);
    schools.push(...(schoolResult.data ?? []));
    assignments.push(...(assignmentResult.data ?? []));
  }

  const roleIds = [...new Set(assignments.map((assignment) => assignment.role_id))];
  const { data: roleRows } = roleIds.length
    ? await supabase.from("roles").select("id, code, name").in("id", roleIds)
    : { data: [] };
  const roleById = new Map((roleRows ?? []).map((role) => [role.id, role]));
  const roleCodes = new Set<string>();
  const roleNames = new Set<string>();

  for (const assignment of assignments) {
    const role = roleById.get(assignment.role_id);
    if (!role) continue;
    roleCodes.add(role.code);
    roleNames.add(roleLabels[role.code] ?? role.name ?? role.code);
  }

  const schoolById = new Map(schools.map((school) => [school.id, school.name]));
  let schoolId: string | null = null;
  let schoolName = "SMA Islam Cikal Harapan 1";
  for (const membership of memberships) {
    schoolId = membership.school_id;
    const nameForSchool = schoolById.get(membership.school_id);
    if (nameForSchool) schoolName = nameForSchool;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    roles: [...roleNames],
    roleCodes: [...roleCodes],
    isAdmin: roleCodes.has("school_admin"),
    isStaff: STAFF_ROLE_CODES.some((code) => roleCodes.has(code)),
    schoolId,
    schoolName,
    hasAccess: memberships.length > 0,
  };
}
