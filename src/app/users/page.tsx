import { redirect } from "next/navigation";
import AppShell from "@/components/sister/AppShell";
import { Badge, Card, EmptyState, PageHeader, StatCard, membershipStatus } from "@/components/sister/ui";
import { ClockIcon, ShieldCheckIcon, UsersIcon } from "@/components/auth/icons";
import { createClient } from "@/lib/supabase/server";
import { getViewer, roleLabels } from "@/lib/sister/viewer";

type MembershipRow = { id: string; user_id: string; status: string; requested_role: string | null; created_at: string };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

export default async function UsersPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin || !viewer.schoolId) redirect("/dashboard");

  const supabase = await createClient();
  const { data: allMemberships, error } = await supabase
    .from("school_memberships")
    .select("id, user_id, status, requested_role, created_at")
    .eq("school_id", viewer.schoolId)
    .order("created_at", { ascending: false });
  const rows: MembershipRow[] = allMemberships ?? [];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] as ProfileRow[] };
  const profileById = new Map((profiles ?? []).map((profile: ProfileRow) => [profile.id, profile]));

  const roleByMembership = new Map<string, string[]>();
  for (const row of rows) {
    const { data: assignments } = await supabase.from("membership_roles").select("role_id").eq("membership_id", row.id).eq("school_id", viewer.schoolId);
    const ids = (assignments ?? []).map((assignment) => assignment.role_id);
    if (ids.length) {
      const { data: roles } = await supabase.from("roles").select("code, name").in("id", ids);
      roleByMembership.set(row.id, (roles ?? []).map((role) => roleLabels[role.code] ?? role.name ?? role.code));
    }
  }

  const activeCount = rows.filter((row) => row.status === "active").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;

  return (
    <AppShell viewer={viewer} active="users">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Manajemen Pengguna" }]}
        title="Manajemen Pengguna"
        description="Daftar keanggotaan civitas sekolah yang berada dalam kewenangan Anda."
      />

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Total keanggotaan" value={rows.length} icon={<UsersIcon className="h-5 w-5" />} />
        <StatCard label="Aktif" value={activeCount} tone="green" icon={<ShieldCheckIcon className="h-5 w-5" />} />
        <StatCard label="Menunggu persetujuan" value={pendingCount} tone="gold" icon={<ClockIcon className="h-5 w-5" />} />
      </div>

      <Card title="Daftar pengguna" description="Data anggota sekolah yang dapat dibaca oleh administrator." className="mt-6" flush>
        {error ? (
          <p className="p-6 text-sm text-red-700">Data belum dapat dimuat. Periksa GRANT dan kebijakan RLS pada tabel keanggotaan, profil, dan peran.</p>
        ) : rows.length === 0 ? (
          <div className="p-6"><EmptyState title="Belum ada data keanggotaan" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#eff7d2] text-[#0b4a28]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">No.</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Nama</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Email</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Peran</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Status</th>
                  <th scope="col" className="whitespace-nowrap px-5 py-3 font-extrabold">Tanggal bergabung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0b4a28]/[0.06]">
                {rows.map((row, index) => {
                  const profile = profileById.get(row.user_id);
                  const assigned = roleByMembership.get(row.id);
                  const requested = row.requested_role ? roleLabels[row.requested_role] ?? row.requested_role : null;
                  const status = membershipStatus(row.status);
                  return (
                    <tr key={row.id} className="transition hover:bg-[#fafcf4]">
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-[#123a25]">{profile?.full_name ?? "Nama belum diisi"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{profile?.email ?? "—"}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {assigned?.length ? (
                          <div className="flex flex-wrap gap-1.5">{assigned.map((label) => <Badge key={label} tone="green">{label}</Badge>)}</div>
                        ) : requested ? (
                          <span className="text-slate-600">Diminta: <span className="font-semibold">{requested}</span></span>
                        ) : (
                          <span className="text-slate-400">Belum ditetapkan</span>
                        )}
                      </td>
                      <td className="px-5 py-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Catatan: halaman ini menampilkan daftar. Persetujuan pendaftaran dan pemberian peran harus dilakukan melalui alur administrator yang tervalidasi; jangan mengizinkan pengguna menentukan peran final sendiri.
      </p>
    </AppShell>
  );
}
