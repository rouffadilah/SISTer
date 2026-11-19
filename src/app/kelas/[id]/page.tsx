import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/sister/AppShell";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/sister/ui";
import { ConfirmButton, FormSubmit, inputClass } from "@/components/sister/forms";
import { UsersIcon } from "@/components/auth/icons";
import { deleteClass, deleteStudent, removeFromClass, updateHomeroom } from "@/app/kelas/actions";
import { AddStudentForm, BulkStudentForm } from "@/app/kelas/forms";
import { createClient } from "@/lib/supabase/server";
import { getHomeroomNames, getTeacherOptions, gradeLabel } from "@/lib/sister/school";
import { getViewer } from "@/lib/sister/viewer";

type StudentRow = { id: string; full_name: string; nis: string | null; nisn: string | null; gender: "L" | "P" | null; membership_id: string | null };

export default async function KelasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.isStaff || !viewer.schoolId) redirect("/dashboard");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: kelas } = await supabase
    .from("classes")
    .select("id, name, grade, program, academic_year, homeroom_membership_id")
    .eq("id", id)
    .eq("school_id", viewer.schoolId)
    .maybeSingle();
  if (!kelas) notFound();

  const { data: studentData } = await supabase
    .from("students")
    .select("id, full_name, nis, nisn, gender, membership_id")
    .eq("class_id", id)
    .eq("status", "active")
    .order("full_name");
  const students: StudentRow[] = studentData ?? [];

  const homeroomName = kelas.homeroom_membership_id ? (await getHomeroomNames(supabase, viewer.schoolId)).get(kelas.homeroom_membership_id) : null;
  const teachers = viewer.isAdmin ? await getTeacherOptions(supabase, viewer.schoolId) : [];
  const male = students.filter((s) => s.gender === "L").length;
  const female = students.filter((s) => s.gender === "P").length;

  return (
    <AppShell viewer={viewer} active="kelas">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kelas & Siswa", href: `/kelas?tahun=${encodeURIComponent(kelas.academic_year)}` },
          { label: kelas.name },
        ]}
        eyebrow={`Tahun ajaran ${kelas.academic_year} · Kelas ${gradeLabel(kelas.grade)}${kelas.program ? ` · ${kelas.program}` : ""}`}
        title={`Kelas ${kelas.name}`}
        description={<>Wali kelas: {homeroomName ? <b className="text-[#123a25]">{homeroomName}</b> : <span className="font-semibold text-[#b07d00]">belum ditentukan</span>}</>}
        actions={
          viewer.isAdmin ? (
            <form action={deleteClass}>
              <input type="hidden" name="class_id" value={kelas.id} />
              <ConfirmButton
                message={`Hapus kelas ${kelas.name}? Data siswanya tidak ikut terhapus, hanya dikeluarkan dari kelas.`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50"
              >
                Hapus kelas
              </ConfirmButton>
            </form>
          ) : undefined
        }
      />

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Jumlah siswa" value={students.length} icon={<UsersIcon className="h-5 w-5" />} />
        <StatCard label="Laki-laki" value={male} />
        <StatCard label="Perempuan" value={female} tone="gold" />
      </div>

      <div className={`mt-6 grid items-start gap-6 ${viewer.isAdmin ? "lg:grid-cols-3" : ""}`}>
        <Card title="Daftar siswa" description="Diurutkan menurut nama." className={viewer.isAdmin ? "lg:col-span-2" : ""} flush>
          {students.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Belum ada siswa di kelas ini">{viewer.isAdmin ? "Tambahkan satu per satu atau tempel daftar dari Excel di samping." : null}</EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#eff7d2] text-[#0b4a28]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-extrabold">No.</th>
                    <th scope="col" className="px-5 py-3 font-extrabold">Nama</th>
                    <th scope="col" className="px-5 py-3 font-extrabold">NIS</th>
                    <th scope="col" className="px-5 py-3 font-extrabold">NISN</th>
                    <th scope="col" className="px-5 py-3 font-extrabold">L/P</th>
                    {viewer.isAdmin && <th scope="col" className="px-5 py-3 text-right font-extrabold">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0b4a28]/[0.06]">
                  {students.map((s, i) => (
                    <tr key={s.id} className="transition hover:bg-[#fafcf4]">
                      <td className="px-5 py-3.5 text-slate-500">{i + 1}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-bold text-[#123a25]">
                        {s.full_name}
                        {s.membership_id && <Badge tone="green" className="ml-2 align-middle">punya akun</Badge>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{s.nis ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{s.nisn ?? "—"}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.gender ?? "—"}</td>
                      {viewer.isAdmin && (
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <form action={removeFromClass} className="inline">
                            <input type="hidden" name="student_id" value={s.id} />
                            <input type="hidden" name="class_id" value={kelas.id} />
                            <ConfirmButton message={`Keluarkan ${s.full_name} dari kelas ${kelas.name}?`} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0b4a28] transition hover:bg-[#eff7d2]">
                              Keluarkan
                            </ConfirmButton>
                          </form>
                          <form action={deleteStudent} className="inline">
                            <input type="hidden" name="student_id" value={s.id} />
                            <input type="hidden" name="class_id" value={kelas.id} />
                            <ConfirmButton message={`Hapus data ${s.full_name} secara permanen?`} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50">
                              Hapus
                            </ConfirmButton>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {viewer.isAdmin && (
          <div className="space-y-6">
            <Card title="Wali kelas">
              <form action={updateHomeroom} className="flex gap-2">
                <input type="hidden" name="class_id" value={kelas.id} />
                <select name="homeroom_membership_id" defaultValue={kelas.homeroom_membership_id ?? ""} aria-label="Wali kelas" className={inputClass} suppressHydrationWarning>
                  <option value="">— Belum ditentukan —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <FormSubmit variant="secondary" pendingText="…">Simpan</FormSubmit>
              </form>
            </Card>
            <Card title="Tambah siswa">
              <AddStudentForm classId={kelas.id} />
            </Card>
            <Card title="Tambah banyak sekaligus">
              <BulkStudentForm classId={kelas.id} />
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
