import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/sister/AppShell";
import { Badge, Card, EmptyState, PageHeader, buttonClasses } from "@/components/sister/ui";
import { FormSubmit, inputClass } from "@/components/sister/forms";
import { assignClass } from "@/app/kelas/actions";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicYear, isMissingTable } from "@/lib/sister/school";
import { getViewer } from "@/lib/sister/viewer";

type StudentRow = { id: string; full_name: string; nis: string | null; nisn: string | null; gender: "L" | "P" | null; class_id: string | null };
type ClassRow = { id: string; name: string; academic_year: string; grade: number };

const PAGE_SIZE = 50;

export default async function SiswaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.isStaff || !viewer.schoolId) redirect("/dashboard");

  const params = await searchParams;
  // Hanya huruf, angka, spasi, titik, petik, dan tanda hubung — aman untuk filter PostgREST.
  const q = (typeof params.q === "string" ? params.q : "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 60);
  const kelas = typeof params.kelas === "string" ? params.kelas : "";
  const page = Math.max(1, Number(typeof params.hal === "string" ? params.hal : 1) || 1);

  const supabase = await createClient();
  const { data: classData } = await supabase.from("classes").select("id, name, academic_year, grade").eq("school_id", viewer.schoolId);
  const classes: ClassRow[] = (classData ?? []).sort((a: ClassRow, b: ClassRow) => b.academic_year.localeCompare(a.academic_year) || a.grade - b.grade || a.name.localeCompare(b.name, "id", { numeric: true }));
  const classById = new Map(classes.map((c) => [c.id, c]));
  const thisYear = currentAcademicYear();
  const currentClasses = classes.filter((c) => c.academic_year === thisYear);

  let query = supabase
    .from("students")
    .select("id, full_name, nis, nisn, gender, class_id", { count: "exact" })
    .eq("school_id", viewer.schoolId)
    .eq("status", "active")
    .order("full_name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`full_name.ilike.%${q}%,nis.ilike.%${q}%,nisn.ilike.%${q}%`);
  if (kelas === "tanpa") query = query.is("class_id", null);
  else if (/^[0-9a-f-]{36}$/i.test(kelas)) query = query.eq("class_id", kelas);

  const { data: studentData, count, error } = await query;
  const students: StudentRow[] = studentData ?? [];
  const total = count ?? students.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => `/siswa?${new URLSearchParams({ ...(q && { q }), ...(kelas && { kelas }), hal: String(n) }).toString()}`;

  return (
    <AppShell viewer={viewer} active="kelas">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Kelas & Siswa", href: "/kelas" }, { label: "Cari siswa" }]}
        title="Cari Siswa"
        description="Cari berdasarkan nama, NIS, atau NISN, dan saring per kelas."
      />

      <form method="get" action="/siswa" className="mt-6 grid gap-3 rounded-[22px] border border-[#0b4a28]/[0.08] bg-white p-4 shadow-[0_18px_40px_-30px_rgba(12,58,32,0.55)] sm:grid-cols-[1fr_220px_auto] sm:items-end sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-[#123a25]">Nama / NIS / NISN</span>
          <input name="q" defaultValue={q} placeholder="mis. Ahmad atau 1001" className={inputClass} suppressHydrationWarning />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-[#123a25]">Kelas</span>
          <select name="kelas" defaultValue={kelas} className={inputClass} suppressHydrationWarning>
            <option value="">Semua kelas</option>
            <option value="tanpa">Belum punya kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.academic_year}</option>
            ))}
          </select>
        </label>
        <button type="submit" suppressHydrationWarning className={buttonClasses("primary", "h-11")}>Cari</button>
      </form>

      <Card title="Hasil" description={`${total} siswa${q ? ` untuk “${q}”` : ""}`} className="mt-6" flush>
        {isMissingTable(error) ? (
          <div className="p-6">
            <EmptyState title="Tabel siswa belum dibuat">Jalankan supabase/kelas-siswa.sql di Supabase SQL Editor.</EmptyState>
          </div>
        ) : students.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Tidak ada siswa yang cocok">Ubah kata kunci atau pilihan kelas.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#eff7d2] text-[#0b4a28]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">Nama</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">NIS</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">NISN</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">L/P</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0b4a28]/[0.06]">
                {students.map((s) => {
                  const c = s.class_id ? classById.get(s.class_id) : null;
                  return (
                    <tr key={s.id} className="transition hover:bg-[#fafcf4]">
                      <td className="whitespace-nowrap px-5 py-3.5 font-bold text-[#123a25]">{s.full_name}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{s.nis ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{s.nisn ?? "—"}</td>
                      <td className="px-5 py-3.5 text-slate-600">{s.gender ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {c ? (
                          <Link href={`/kelas/${c.id}`} className="font-bold text-[#0e5a31]! hover:text-[#f26a0f]!">
                            {c.name} <span className="font-normal text-slate-500">· {c.academic_year}</span>
                          </Link>
                        ) : viewer.isAdmin && currentClasses.length ? (
                          <form action={assignClass} className="flex items-center gap-2">
                            <input type="hidden" name="student_id" value={s.id} />
                            <select name="class_id" required defaultValue="" aria-label={`Kelas untuk ${s.full_name}`} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm" suppressHydrationWarning>
                              <option value="" disabled>Pilih kelas…</option>
                              {currentClasses.map((cc) => (
                                <option key={cc.id} value={cc.id}>{cc.name}</option>
                              ))}
                            </select>
                            <FormSubmit variant="secondary" className="h-9 px-3 py-0" pendingText="…">Pasang</FormSubmit>
                          </form>
                        ) : (
                          <Badge tone="gold">Belum punya kelas</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pages > 1 && (
        <nav aria-label="Halaman hasil" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">Halaman {page} dari {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={pageHref(page - 1)} className={buttonClasses("secondary")}>← Sebelumnya</Link>}
            {page < pages && <Link href={pageHref(page + 1)} className={buttonClasses("secondary")}>Berikutnya →</Link>}
          </div>
        </nav>
      )}
    </AppShell>
  );
}
