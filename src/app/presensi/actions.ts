"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/sister/forms";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/sister/school";
import { getViewer } from "@/lib/sister/viewer";

const attendanceStatuses = ["present", "late", "sick", "permission", "absent"] as const;
type AttendanceStatus = (typeof attendanceStatuses)[number];

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function friendlyError(error: { code?: string; message?: string }, fallback: string) {
  if (isMissingTable(error)) return "Fitur presensi belum disiapkan. Minta admin menerapkan supabase/presensi.sql.";
  if (error.code === "42501" || error.code === "PGRST301") return "Akun Anda tidak memiliki izin untuk mengubah presensi kelas ini.";
  if (error.code === "40001") return "Data presensi atau daftar siswa berubah sejak halaman dibuka. Muat ulang sebelum menyimpan.";
  return fallback;
}

async function attendanceContext() {
  const viewer = await getViewer();
  const canUseAttendance = viewer.isAdmin || viewer.roleCodes.includes("teacher") || viewer.roleCodes.includes("homeroom_teacher");
  if (!viewer.schoolId || !canUseAttendance) return null;

  const supabase = await createClient();
  let membershipId: string | null = null;
  if (!viewer.isAdmin) {
    const { data: membership } = await supabase
      .from("school_memberships")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("school_id", viewer.schoolId)
      .eq("status", "active")
      .maybeSingle();
    membershipId = membership?.id ?? null;
    if (!membershipId) return null;
  }

  return { viewer, supabase, schoolId: viewer.schoolId, membershipId };
}

export async function saveAttendance(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const context = await attendanceContext();
  if (!context) return { error: "Presensi hanya dapat diisi Admin Sekolah atau wali kelas yang ditugaskan." };

  const classId = String(formData.get("class_id") ?? "").trim();
  const attendanceDate = String(formData.get("attendance_date") ?? "").trim();
  const revisionValue = String(formData.get("attendance_revision") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return { error: "Pilih kelas yang valid." };
  if (!validDate(attendanceDate)) return { error: "Tanggal presensi tidak valid." };
  if (!/^(0|[1-9][0-9]*)$/.test(revisionValue)) return { error: "Versi data presensi tidak valid. Muat ulang halaman." };
  const expectedRevision = Number(revisionValue);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision > 2147483647) {
    return { error: "Versi data presensi tidak valid. Muat ulang halaman." };
  }

  const { data: kelas, error: classError } = await context.supabase
    .from("classes")
    .select("id, homeroom_membership_id")
    .eq("id", classId)
    .eq("school_id", context.schoolId)
    .maybeSingle();
  if (classError) return { error: friendlyError(classError, "Data kelas belum dapat diperiksa.") };
  if (!kelas) return { error: "Kelas tidak ditemukan." };
  if (!context.viewer.isAdmin && kelas.homeroom_membership_id !== context.membershipId) {
    return { error: "Anda hanya dapat mengisi presensi kelas yang menjadi tanggung jawab Anda." };
  }

  const { data: students, error: studentError } = await context.supabase
    .from("students")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("class_id", classId)
    .eq("status", "active")
    .order("id");
  if (studentError) return { error: friendlyError(studentError, "Daftar siswa belum dapat dimuat.") };
  if ((students?.length ?? 0) > 500) return { error: "Kelas memiliki lebih dari 500 siswa aktif. Hubungi administrator." };

  const entries: { student_id?: string; record_id?: string; status: AttendanceStatus }[] = [];
  for (const student of students ?? []) {
    const status = String(formData.get("status_student_" + student.id) ?? "");
    if (!attendanceStatuses.includes(status as AttendanceStatus)) {
      return { error: "Pilih status kehadiran untuk setiap siswa aktif." };
    }
    entries.push({ student_id: student.id, status: status as AttendanceStatus });
  }

  const historicalRecordIds = formData.getAll("historical_record_id").map((value) => String(value).trim());
  if (historicalRecordIds.length > 1000 || historicalRecordIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    return { error: "Daftar rekam historis tidak valid. Muat ulang halaman." };
  }
  if (new Set(historicalRecordIds).size !== historicalRecordIds.length) {
    return { error: "Ada rekam historis ganda. Muat ulang halaman." };
  }
  for (const recordId of historicalRecordIds) {
    const status = String(formData.get("status_record_" + recordId) ?? "");
    if (!attendanceStatuses.includes(status as AttendanceStatus)) {
      return { error: "Pilih status untuk setiap rekam historis." };
    }
    entries.push({ record_id: recordId, status: status as AttendanceStatus });
  }
  if (!entries.length) return { error: "Belum ada siswa atau rekam presensi yang dapat disimpan." };

  const { error: saveError } = await context.supabase.rpc("sister_save_attendance", {
    p_school_id: context.schoolId,
    p_class_id: classId,
    p_attendance_date: attendanceDate,
    p_expected_revision: expectedRevision,
    p_entries: entries,
  });
  if (saveError) return { error: friendlyError(saveError, "Presensi belum dapat disimpan. Muat ulang lalu coba lagi.") };

  revalidatePath("/presensi");
  revalidatePath("/kelas/" + classId);
  return { ok: "Presensi tanggal " + attendanceDate.split("-").reverse().join("/") + " berhasil disimpan." };
}
