import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/sister/AppShell";
import { Badge, ButtonLink, Card, EmptyState, IconTile, PageHeader, StatCard } from "@/components/sister/ui";
import { BookOpenIcon, GraduationCapIcon, UserIcon, UsersIcon } from "@/components/auth/icons";
import { ClassCreateForm } from "@/app/kelas/forms";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicYear, getHomeroomNames, getTeacherOptions, gradeLabel, gradeOptions, isAcademicYear, isMissingTable } from "@/lib/sister/school";
import { getViewer } from "@/lib/sister/viewer";

type ClassRow = { id: string; name: string; grade: number; program: string | null; academic_year: string; homeroom_membership_id: string | null };

export default async function KelasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.isStaff || !viewer.schoolId) redirect("/dashboard");

  const params = await searchParams;
  const requestedYear = typeof params.tahun === "string" && isAcademicYear(params.tahun) ? params.tahun : null;
  const supabase = await createClient();

  const { data: yearRows, error: yearError } = await supabase.from("classes").select("academic_year").eq("school_id", viewer.schoolId);
  const thisYear = currentAcademicYear();
  const years = [...new Set([thisYear, ...(yearRows ?? []).map((r) => r.academic_year as string)])].sort().reverse();
  const year = requestedYear ?? thisYear;

  const { data: classData } = await supabase
    .from("classes")
    .select("id, name, grade, program, academic_year, homeroom_membership_id")
    .eq("school_id", viewer.schoolId)
    .eq("academic_year", year)
    .order("grade")
    .order("name");
  const classes: ClassRow[] = (classData ?? []).sort((a: ClassRow, b: ClassRow) => a.grade - b.grade || a.name.localeCompare(b.name, "id", { numeric: true }));

  const { data: counts } = classes.length ? await supabase.rpc("sister_class_counts", { p_school_id: viewer.schoolId }) : { data: [] };
  const countByClass = new Map<string, number>(((counts ?? []) as { class_id: string; total: number }[]).map((c) => [c.class_id, Number(c.total)]));
  const homeroomNames = classes.length ? await getHomeroomNames(supabase, viewer.schoolId) : new Map<string, string>();
  const teachers = viewer.isAdmin ? await getTeacherOptions(supabase, viewer.schoolId) : [];

  const totalStudents = classes.reduce((sum, c) => sum + (countByClass.get(c.id) ?? 0), 0);
  const withoutHomeroom = classes.filter((c) => !c.homeroom_membership_id).length;
  const setupNeeded = isMissingTable(yearError);

  return (
    <AppShell viewer={viewer} active="kelas">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Kelas & Siswa" }]}
        title="Kelas & Siswa"
        description="Daftar rombongan belajar per tahun ajaran beserta wali kelas dan jumlah siswanya."
        actions={
          <ButtonLink href="/siswa" variant="secondary">
            <UserIcon className="h-4 w-4" /> Cari siswa
          </ButtonLink>
        }
      />

      {setupNeeded ? (
        <Card className="mt-6">
          <EmptyState title="Tabel kelas dan siswa belum dibuat">
            Jalankan file <code className="rounded bg-slate-100 px-1.5 py-0.5">supabase/kelas-siswa.sql</code> di Supabase → SQL Editor, lalu muat ulang halaman ini.
          </EmptyState>
        </Card>
      ) : (
        <>
          <nav aria-label="Tahun ajaran" className="mt-6 flex flex-wrap gap-2">
            {years.map((y) => (
              <Link
                key={y}
                href={`/kelas?tahun=${encodeURIComponent(y)}`}
                aria-current={y === year ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-bold ring-1 ring-inset transition ${y === year ? "bg-[#0b4a28] text-white! ring-[#0b4a28]" : "bg-white text-[#0b4a28]! ring-[#0b4a28]/15 hover:bg-[#f4f8ec]"}`}
              >
                {y}
              </Link>
            ))}
          </nav>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard label="Jumlah kelas" value={classes.length} icon={<BookOpenIcon className="h-5 w-5" />} />
            <StatCard label="Siswa aktif" value={totalStudents} icon={<UsersIcon className="h-5 w-5" />} />
            <StatCard label="Belum ada wali kelas" value={withoutHomeroom} tone={withoutHomeroom ? "gold" : "green"} icon={<GraduationCapIcon className="h-5 w-5" />} />
          </div>

          <div className={`mt-6 grid items-start gap-6 ${viewer.isAdmin ? "lg:grid-cols-3" : ""}`}>
            <div className={`space-y-6 ${viewer.isAdmin ? "lg:col-span-2" : ""}`}>
              {classes.length === 0 ? (
                <Card>
                  <EmptyState title={`Belum ada kelas untuk tahun ajaran ${year}`}>
                    {viewer.isAdmin ? "Tambahkan kelas lewat formulir di samping." : "Hubungi Admin Sekolah untuk menambahkan kelas."}
                  </EmptyState>
                </Card>
              ) : (
                gradeOptions.map((g) => {
                  const list = classes.filter((c) => c.grade === g.value);
                  if (!list.length) return null;
                  return (
                    <Card key={g.value} title={`Kelas ${g.label}`} description={`${list.length} rombel`}>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
                        {list.map((c) => {
                          const total = countByClass.get(c.id) ?? 0;
                          const wali = c.homeroom_membership_id ? homeroomNames.get(c.homeroom_membership_id) ?? "—" : null;
                          return (
                            <Link key={c.id} href={`/kelas/${c.id}`} className="group min-w-0 rounded-2xl border border-[#0b4a28]/10 bg-white p-3 transition sm:p-4 hover:-translate-y-0.5 hover:border-[#0b4a28]/25 hover:shadow-[0_16px_30px_-22px_rgba(12,58,32,0.6)]">
                              <div className="flex items-start justify-between gap-3">
                                <IconTile className="h-9 w-9 rounded-xl text-sm font-extrabold sm:h-11 sm:w-11 sm:text-base">{gradeLabel(c.grade)}</IconTile>
                                <Badge tone={total ? "green" : "slate"}>{total} siswa</Badge>
                              </div>
                              <h3 className="mt-3 text-lg font-extrabold text-[#123a25]">{c.name}</h3>
                              {c.program && <p className="text-xs font-bold uppercase tracking-wide text-[#b07d00]">{c.program}</p>}
                              <p className="mt-1 truncate text-xs text-slate-600 sm:text-sm">
                                Wali kelas: {wali ? <span className="font-semibold text-slate-700">{wali}</span> : <span className="text-[#b07d00]">belum ditentukan</span>}
                              </p>
                              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#f26a0f] transition group-hover:translate-x-1">
                                Lihat siswa <span aria-hidden="true">→</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {viewer.isAdmin && (
              <div>
                <Card title="Tambah kelas" description="Hanya Admin Sekolah." className="lg:sticky lg:top-24">
                  <ClassCreateForm defaultYear={year} teachers={teachers} />
                </Card>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
