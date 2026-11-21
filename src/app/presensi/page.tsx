import { redirect } from "next/navigation";
import AppShell from "@/components/sister/AppShell";
import { AttendanceForm } from "@/app/presensi/forms";
import { Badge, Card, EmptyState, PageHeader, StatCard, buttonClasses } from "@/components/sister/ui";
import { inputClass } from "@/components/sister/forms";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/sister/school";
import { getViewer } from "@/lib/sister/viewer";

type ClassRow = { id: string; name: string; grade: number; academic_year: string; homeroom_membership_id: string | null };
type StudentRow = { id: string; full_name: string; nis: string | null };
type AttendanceRecord = { student_id: string | null; status: "present" | "late" | "sick" | "permission" | "absent" };

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function PresensiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const canUseAttendance = viewer.isAdmin || viewer.roleCodes.includes("teacher") || viewer.roleCodes.includes("homeroom_teacher");
  if (!viewer.schoolId || !canUseAttendance) redirect("/dashboard");

  const params = await searchParams;
  const attendanceDate = typeof params.tanggal === "string" && validDate(params.tanggal) ? params.tanggal : jakartaToday();
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
  }

  let classes: ClassRow[] = [];
  let classError: { code?: string; message?: string } | null = null;
  if (viewer.isAdmin) {
    const result = await supabase
      .from("classes")
      .select("id, name, grade, academic_year, homeroom_membership_id")
      .eq("school_id", viewer.schoolId)
      .order("academic_year", { ascending: false })
      .order("grade")
      .order("name");
    classes = (result.data ?? []) as ClassRow[];
    classError = result.error;
  } else if (membershipId) {
    const result = await supabase
      .from("classes")
      .select("id, name, grade, academic_year, homeroom_membership_id")
      .eq("school_id", viewer.schoolId)
      .eq("homeroom_membership_id", membershipId)
      .order("academic_year", { ascending: false })
      .order("grade")
      .order("name");
    classes = (result.data ?? []) as ClassRow[];
    classError = result.error;
  }

  const requestedClass = typeof params.kelas === "string" ? params.kelas : "";
  const currentAcademicYear = new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date());
  const academicYearPrefix = Number(currentAcademicYear) - (new Date(attendanceDate + "T00:00:00.000Z").getUTCMonth() < 6 ? 1 : 0);
  const activeYear = academicYearPrefix + "/" + (academicYearPrefix + 1);
  const selectedClass = classes.find((item) => item.id === requestedClass) ?? classes.find((item) => item.academic_year === activeYear) ?? classes[0] ?? null;

  let students: StudentRow[] = [];
  let studentError: { code?: string; message?: string } | null = null;
  let sessionError: { code?: string; message?: string } | null = null;
  let recordsError: { code?: string; message?: string } | null = null;
  let records: AttendanceRecord[] = [];

  if (selectedClass) {
    const [studentResult, sessionResult] = await Promise.all([
      supabase.from("students").select("id, full_name, nis").eq("school_id", viewer.schoolId).eq("class_id", selectedClass.id).eq("status", "active").order("full_name"),
      supabase.from("attendance_sessions").select("id").eq("school_id", viewer.schoolId).eq("class_id", selectedClass.id).eq("attendance_date", attendanceDate).maybeSingle(),
    ]);
    students = (studentResult.data ?? []) as StudentRow[];
    studentError = studentResult.error;
    sessionError = sessionResult.error;

    if (sessionResult.data?.id) {
      const recordsResult = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("school_id", viewer.schoolId)
        .eq("session_id", sessionResult.data.id);
      records = (recordsResult.data ?? []) as AttendanceRecord[];
      recordsError = recordsResult.error;
    }
  }

  const setupNeeded = [classError, studentError, sessionError, recordsError].some(isMissingTable);
  const loadFailed = [classError, studentError, sessionError, recordsError].some((error) => Boolean(error && !isMissingTable(error)));
  const count = (status: AttendanceRecord["status"]) => records.filter((record) => record.status === status).length;
  const deleteNotice = params.hapus === "riwayat"
    ? "Kelas tidak dihapus karena sudah memiliki riwayat presensi. Riwayat tetap tersimpan."
    : params.hapus === "periksa"
      ? "Kelas belum dihapus karena riwayat presensi tidak dapat diperiksa. Coba lagi."
      : "";

  return (
    <AppShell viewer={viewer} active="presensi">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Presensi" }]}
        title="Presensi Harian"
        description="Catat dan perbarui kehadiran siswa per kelas dan tanggal."
      />

      {deleteNotice && <p role="status" className="mt-5 rounded-xl border border-[#e0a516]/30 bg-[#fff4cc] px-4 py-3 text-sm font-semibold text-[#7a5600]">{deleteNotice}</p>}

      {setupNeeded ? (
        <Card className="mt-6">
          <EmptyState title="Tabel presensi belum disiapkan">
            Jalankan <code className="rounded bg-slate-100 px-1.5 py-0.5">supabase/presensi.sql</code> di Supabase SQL Editor, lalu muat ulang halaman ini.
          </EmptyState>
        </Card>
      ) : loadFailed ? (
        <Card className="mt-6">
          <EmptyState title="Data presensi belum dapat dimuat">Muat ulang halaman atau hubungi Admin Sekolah.</EmptyState>
        </Card>
      ) : classes.length === 0 ? (
        <Card className="mt-6">
          <EmptyState title="Belum ada kelas yang dapat diakses">
            Admin Sekolah perlu membuat kelas dan menetapkan Anda sebagai wali kelas.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <form method="get" className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#123a25]">Kelas</span>
                <select name="kelas" defaultValue={selectedClass?.id} required className={inputClass}>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academic_year}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-[#123a25]">Tanggal</span>
                <input type="date" name="tanggal" defaultValue={attendanceDate} required className={inputClass} />
              </label>
              <button type="submit" className={buttonClasses("secondary")}>Tampilkan</button>
            </form>
          </Card>

          {students.length === 0 ? (
            <Card className="mt-6">
              <EmptyState title={"Belum ada siswa aktif di " + selectedClass?.name}>
                Tambahkan siswa ke kelas terlebih dahulu melalui menu Kelas & Siswa.
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-5">
                <StatCard label="Hadir" value={count("present")} />
                <StatCard label="Terlambat" value={count("late")} tone="gold" />
                <StatCard label="Sakit" value={count("sick")} tone="orange" />
                <StatCard label="Izin" value={count("permission")} tone="gold" />
                <StatCard label="Alpa" value={count("absent")} tone="orange" />
              </div>
              <Card
                className="mt-6"
                title={"Presensi " + selectedClass?.name}
                description={attendanceDate.split("-").reverse().join("/") + " · " + students.length + " siswa aktif"}
                action={records.length ? <Badge tone="green">Sudah disimpan</Badge> : <Badge tone="slate">Belum disimpan</Badge>}
                flush
              >
                <div className="p-4 sm:p-6">
                  <AttendanceForm classId={selectedClass?.id ?? ""} attendanceDate={attendanceDate} students={students} records={records} />
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
