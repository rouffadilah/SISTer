import { redirect } from "next/navigation";
import AppShell from "@/components/sister/AppShell";
import { Badge, Card, EmptyState, PageHeader, StatCard, membershipStatus } from "@/components/sister/ui";
import { ClockIcon, ShieldCheckIcon, UsersIcon } from "@/components/auth/icons";
import ApproveMembershipButton from "@/app/users/ApproveMembershipButton";
import { createClient } from "@/lib/supabase/server";
import { getViewer, roleLabels } from "@/lib/sister/viewer";

type MembershipRow = {
  id: string;
  user_id: string;
  status: string;
  requested_role: string | null;
  created_at: string;
};
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
  const membershipIds = rows.map((row) => row.id);
  const userIds = [...new Set(rows.map((row) => row.user_id))];

  const [profileResult, assignmentResult] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    membershipIds.length
      ? supabase
          .from("membership_roles")
          .select("membership_id, role_id")
          .eq("school_id", viewer.schoolId)
          .in("membership_id", membershipIds)
      : Promise.resolve({ data: [] as { membership_id: string; role_id: string }[] }),
  ]);
  const profileById = new Map((profileResult.data ?? []).map((profile: ProfileRow) => [profile.id, profile]));

  const roleIds = [...new Set((assignmentResult.data ?? []).map((assignment) => assignment.role_id))];
  const { data: roleRows } = roleIds.length
    ? await supabase.from("roles").select("id, code, name").in("id", roleIds)
    : { data: [] };
  const roleById = new Map((roleRows ?? []).map((role) => [
    role.id,
    roleLabels[role.code] ?? role.name ?? role.code,
  ]));
  const roleByMembership = new Map<string, string[]>();
  for (const assignment of assignmentResult.data ?? []) {
    const label = roleById.get(assignment.role_id);
    if (!label) continue;
    const labels = roleByMembership.get(assignment.membership_id) ?? [];
    labels.push(label);
    roleByMembership.set(assignment.membership_id, labels);
  }

  const activeCount = rows.filter((row) => row.status === "active").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;

  return (
    <AppShell viewer={viewer} active="users">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Manajemen Pengguna" }]}
        title="Manajemen Pengguna"
        description="Kelola keanggotaan dan permintaan akses civitas sekolah."
      />

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Total keanggotaan" value={rows.length} icon={<UsersIcon className="h-5 w-5" />} />
        <StatCard label="Aktif" value={activeCount} tone="green" icon={<ShieldCheckIcon className="h-5 w-5" />} />
        <StatCard label="Menunggu persetujuan" value={pendingCount} tone="gold" icon={<ClockIcon className="h-5 w-5" />} />
      </div>

      <Card
        title="Permintaan pendaftaran"
        description="Setujui atau tolak akun setelah memeriksa nama, email, dan jenis pengguna yang diminta."
        className="mt-6"
        flush
      >
        {error ? (
          <p className="p-6 text-sm text-red-700">
            Data belum dapat dimuat. Periksa GRANT dan kebijakan RLS pada tabel keanggotaan, profil, dan peran.
          </p>
        ) : pendingCount === 0 ? (
          <div className="p-6"><EmptyState title="Tidak ada pendaftaran yang menunggu persetujuan" /></div>
        ) : (
          <div className="divide-y divide-[#0b4a28]/[0.08]">
            {rows.filter((row) => row.status === "pending").map((row) => {
              const profile = profileById.get(row.user_id);
              const requested = row.requested_role
                ? roleLabels[row.requested_role] ?? row.requested_role
                : "Belum ditentukan";
              return (
                <div key={row.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="font-extrabold text-[#123a25]">{profile?.full_name ?? "Nama belum diisi"}</p>
                    <p className="mt-0.5 break-all text-sm text-slate-600">{profile?.email ?? "Email tidak tersedia"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone="gold">Menunggu persetujuan</Badge>
                      <span className="text-xs text-slate-500">Permintaan peran: {requested}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Mendaftar {new Date(row.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ApproveMembershipButton membershipId={row.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Seluruh keanggotaan" description="Status dan peran anggota sekolah." className="mt-6" flush>
        {error ? (
          <p className="p-6 text-sm text-red-700">Daftar keanggotaan gagal dimuat.</p>
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
                  const requested = row.requested_role
                    ? roleLabels[row.requested_role] ?? row.requested_role
                    : null;
                  const status = membershipStatus(row.status);
                  return (
                    <tr key={row.id} className="transition hover:bg-[#fafcf4]">
                      <td className="px-5 py-4 text-slate-500">{index + 1}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-[#123a25]">
                        {profile?.full_name ?? "Nama belum diisi"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {profile?.email ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {assigned?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assigned.map((label) => <Badge key={label} tone="green">{label}</Badge>)}
                          </div>
                        ) : requested ? (
                          <span className="text-slate-600">Diminta: <span className="font-semibold">{requested}</span></span>
                        ) : (
                          <span className="text-slate-400">Belum ditetapkan</span>
                        )}
                      </td>
                      <td className="px-5 py-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {new Date(row.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
