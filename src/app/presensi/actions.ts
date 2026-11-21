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
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return { error: "Pilih kelas yang valid." };
  if (!validDate(attendanceDate)) return { error: "Tanggal presensi tidak valid." };

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
    .select("id, full_name")
    .eq("school_id", context.schoolId)
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name");
  if (studentError) return { error: friendlyError(studentError, "Daftar siswa belum dapat dimuat.") };
  if (!students?.length) return { error: "Belum ada siswa aktif di kelas ini." };
  if (students.length > 500) return { error: "Kelas memiliki lebih dari 500 siswa aktif. Hubungi administrator." };

  const rows: { student_id: string; student_name: string; status: AttendanceStatus; school_id: string }[] = [];
  for (const student of students) {
    const status = String(formData.get("status_" + student.id) ?? "");
    if (!attendanceStatuses.includes(status as AttendanceStatus)) {
      return { error: "Pilih status kehadiran untuk setiap siswa." };
    }
    rows.push({
      student_id: student.id,
      student_name: student.full_name,
      status: status as AttendanceStatus,
      school_id: context.schoolId,
    });
  }

  const { data: existingSession, error: sessionReadError } = await context.supabase
    .from("attendance_sessions")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("class_id", classId)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();
  if (sessionReadError) return { error: friendlyError(sessionReadError, "Sesi presensi belum dapat diperiksa.") };

  let sessionId = existingSession?.id;
  if (!sessionId) {
    const { data: createdSession, error: sessionCreateError } = await context.supabase
      .from("attendance_sessions")
      .insert({ school_id: context.schoolId, class_id: classId, attendance_date: attendanceDate })
      .select("id")
      .single();
    if (sessionCreateError?.code === "23505") {
      const { data: racedSession, error: racedReadError } = await context.supabase
        .from("attendance_sessions")
        .select("id")
        .eq("school_id", context.schoolId)
        .eq("class_id", classId)
        .eq("attendance_date", attendanceDate)
        .maybeSingle();
      if (racedReadError || !racedSession) return { error: friendlyError(racedReadError ?? sessionCreateError, "Sesi presensi bertabrakan. Muat ulang lalu coba lagi.") };
      sessionId = racedSession.id;
    } else if (sessionCreateError || !createdSession) {
      return { error: friendlyError(sessionCreateError ?? {}, "Sesi presensi belum dapat dibuat.") };
    } else {
      sessionId = createdSession.id;
    }
  }

  const { error: recordError } = await context.supabase.from("attendance_records").upsert(
    rows.map((row) => ({ ...row, session_id: sessionId })),
    { onConflict: "session_id,student_id" },
  );
  if (recordError) return { error: friendlyError(recordError, "Presensi belum dapat disimpan. Coba lagi.") };

  revalidatePath("/presensi");
  revalidatePath("/kelas/" + classId);
  return { ok: "Presensi tanggal " + attendanceDate.split("-").reverse().join("/") + " berhasil disimpan." };
}
