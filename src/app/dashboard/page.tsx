import Image from "next/image";
import Link from "next/link";
import AppShell from "@/components/sister/AppShell";
import { Badge, ButtonLink, Card, HeroBanner, IconTile } from "@/components/sister/ui";
import { ClockIcon, GraduationCapIcon, MegaphoneIcon, ShieldCheckIcon, UsersIcon } from "@/components/auth/icons";
import { getViewer } from "@/lib/sister/viewer";

const schoolValues = [
  { label: "Berkarakter", icon: "/images/nilai/berkarakter.png", width: 212, height: 136 },
  { label: "Mandiri", icon: "/images/nilai/mandiri.png", width: 189, height: 163 },
  { label: "Peduli Sesama", icon: "/images/nilai/peduli-sesama.png", width: 194, height: 186 },
];

const upcomingModules = [
  { title: "Akademik & pembelajaran", text: "Jadwal, kelas, materi, tugas, dan penilaian.", icon: <GraduationCapIcon className="h-6 w-6" /> },
  { title: "Presensi", text: "Kehadiran harian siswa per kelas.", icon: <ClockIcon className="h-6 w-6" /> },
  { title: "Komunikasi sekolah", text: "Pengumuman dan informasi untuk orang tua/wali.", icon: <MegaphoneIcon className="h-6 w-6" /> },
];

export default async function DashboardPage() {
  const viewer = await getViewer();

  if (!viewer.hasAccess) {
    return (
      <AppShell viewer={viewer} active="dashboard">
        <Card className="mx-auto max-w-2xl" bodyClassName="py-8 sm:px-8">
          <div className="flex items-start gap-4">
            <IconTile><ShieldCheckIcon className="h-6 w-6" /></IconTile>
            <div>
              <Badge tone="gold">Menunggu persetujuan</Badge>
              <h1 className="mt-3 text-xl font-extrabold text-[#0b4a28]">Akses belum tersedia</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Akun Anda belum memiliki keanggotaan aktif. Jika baru mendaftar, tunggu persetujuan administrator sekolah.
              </p>
            </div>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell viewer={viewer} active="dashboard">
      <HeroBanner eyebrow={viewer.schoolName} title={<>Selamat datang, {viewer.name}</>} description={`Portal layanan digital civitas ${viewer.schoolName}.`}>
        <Badge tone="gold" className="px-3 py-1.5 text-[13px]">Peran Anda: {viewer.roles.join(", ") || "Anggota"}</Badge>
        {viewer.isAdmin && (
          <ButtonLink href="/users" variant="gold" className="py-2">
            Buka Manajemen Pengguna <span aria-hidden="true">→</span>
          </ButtonLink>
        )}
      </HeroBanner>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3">
        <Card title="Akses cepat" description="Modul ditampilkan sesuai hak akses akun Anda." className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {viewer.isAdmin && (
              <Link href="/users" className="group rounded-2xl border border-[#0b4a28]/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#0b4a28]/25 hover:shadow-[0_16px_30px_-22px_rgba(12,58,32,0.6)]">
                <IconTile><UsersIcon className="h-6 w-6" /></IconTile>
                <h3 className="mt-4 font-extrabold text-[#123a25]">Manajemen Pengguna</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Lihat keanggotaan dan kelola akses civitas sekolah.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#f26a0f] transition group-hover:translate-x-1">
                  Buka modul <span aria-hidden="true">→</span>
                </span>
              </Link>
            )}
            {upcomingModules.map((module) => (
              <div key={module.title} className="rounded-2xl border border-dashed border-[#0b4a28]/20 bg-[#fbfcf7] p-5">
                <div className="flex items-start justify-between gap-3">
                  <IconTile className="bg-[#eef1e8] text-[#5b7a64]">{module.icon}</IconTile>
                  <Badge tone="slate">Segera hadir</Badge>
                </div>
                <h3 className="mt-4 font-extrabold text-[#123a25]">{module.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{module.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Akun Anda">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Nama</dt>
                <dd className="text-right font-bold text-[#123a25]">{viewer.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Email</dt>
                <dd className="min-w-0 truncate text-right font-semibold text-slate-700">{viewer.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Peran</dt>
                <dd className="text-right font-semibold text-slate-700">{viewer.roles.join(", ") || "Anggota"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd><Badge tone="green">Aktif</Badge></dd>
              </div>
            </dl>
          </Card>

          <Card title="Nilai sekolah" description="Bersama Membangun Bangsa">
            <ul className="space-y-3">
              {schoolValues.map((value) => (
                <li key={value.label} className="flex items-center gap-3">
                  <span className="grid h-12 w-[60px] shrink-0 place-items-center rounded-xl bg-[#eff7d2]">
                    <Image src={value.icon} alt="" width={value.width} height={value.height} className="h-8 w-auto" />
                  </span>
                  <span aria-hidden="true" className="h-8 w-1 rounded-full bg-[#ffc80c]" />
                  <span className="font-extrabold text-[#0b4a28]">{value.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
