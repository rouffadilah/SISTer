import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { nunito } from "@/components/sister/fonts";
import { BookOpenIcon, HomeIcon, LogOutIcon, UsersIcon } from "@/components/auth/icons";
import type { Viewer } from "@/lib/sister/viewer";

/*
 * Kerangka semua halaman setelah login: header, latar, dan footer bertema SISTer.
 * Pakai di setiap halaman baru:
 *   const viewer = await getViewer();
 *   return <AppShell viewer={viewer} active="dashboard">...</AppShell>;
 * Tambahkan menu baru di `navItems` di bawah.
 */

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  /** hanya tampil untuk Admin Sekolah */
  adminOnly?: boolean;
  /** hanya tampil untuk guru/staf/pimpinan/admin */
  staffOnly?: boolean;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: <HomeIcon className="h-[18px] w-[18px]" /> },
  { key: "kelas", label: "Kelas & Siswa", href: "/kelas", icon: <BookOpenIcon className="h-[18px] w-[18px]" />, staffOnly: true },
  { key: "users", label: "Manajemen Pengguna", href: "/users", icon: <UsersIcon className="h-[18px] w-[18px]" />, adminOnly: true },
];

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function starPattern() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='none' stroke='rgba(201,160,58,0.5)' stroke-width='0.8'><rect x='8.3' y='8.3' width='23.4' height='23.4'/><rect x='8.3' y='8.3' width='23.4' height='23.4' transform='rotate(45 20 20)'/><path d='M20 0v3.45M20 36.55V40M0 20h3.45M36.55 20H40M0 0l8.3 8.3M40 0l-8.3 8.3M0 40l8.3-8.3M40 40l-8.3-8.3'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const navLink =
  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5a31]/30";

type AppShellProps = {
  viewer: Viewer;
  /** kunci menu yang sedang dibuka, mis. "dashboard" atau "users" */
  active?: string;
  children: ReactNode;
};

export default function AppShell({ viewer, active, children }: AppShellProps) {
  const items = navItems.filter((item) => (!item.adminOnly || viewer.isAdmin) && (!item.staffOnly || viewer.isStaff));
  const roleText = viewer.roles.length ? viewer.roles.join(", ") : viewer.hasAccess ? "Anggota" : "Menunggu persetujuan";

  const navLinks = (extra = "") =>
    items.map((item) => {
      const isActive = item.key === active;
      return (
        <Link
          key={item.key}
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={`${navLink} ${extra} ${isActive ? "bg-[#eff7d2] text-[#0b4a28]!" : "text-slate-600! hover:bg-[#f4f8ec] hover:text-[#0b4a28]!"}`}
        >
          {item.icon}
          {item.label}
        </Link>
      );
    });

  return (
    <div className={`${nunito.className} relative isolate flex min-h-dvh flex-col bg-[#f6f7f1] text-[#1f2f27]`}>
      {/* pola Islami tipis di pojok kiri atas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 -z-10 h-[420px] w-[min(520px,60vw)] opacity-70"
        style={{
          backgroundImage: starPattern(),
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 80% at 0% 0%, #000 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 0% 0%, #000 0%, transparent 70%)",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-[#0b4a28]/[0.08] bg-white/95 shadow-[0_10px_30px_-24px_rgba(8,54,29,0.6)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link href="/dashboard" aria-label="SISTer — Dashboard" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5a31]/30">
            <Image src="/images/sister-logo.png" alt="SISTer" width={676} height={272} className="h-10 w-auto lg:h-12" />
          </Link>

          <nav aria-label="Menu utama" className="ml-4 hidden items-center gap-1 md:flex">
            {navLinks()}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2.5 text-right sm:flex">
              <div className="leading-tight">
                <p className="max-w-[180px] truncate text-sm font-extrabold text-[#123a25]">{viewer.name}</p>
                <p className="max-w-[180px] truncate text-xs font-semibold text-[#b07d00]">{roleText}</p>
              </div>
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-[#0b4a28] text-sm font-extrabold text-[#ffc80c] ring-2 ring-[#ffc80c]/70 ring-offset-2">
                {initials(viewer.name)}
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" suppressHydrationWarning className="inline-flex items-center gap-2 rounded-xl bg-[#0b4a28] px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-[#0b4a28]/20 transition hover:bg-[#0e5a31] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f5a31]/30 sm:px-4">
                <LogOutIcon className="h-[18px] w-[18px]" />
                <span className="sr-only sm:not-sr-only">Keluar</span>
              </button>
            </form>
          </div>
        </div>

        {/* menu untuk ponsel */}
        <nav aria-label="Menu utama" className="flex gap-1 overflow-x-auto border-t border-[#0b4a28]/[0.06] px-3 py-2 md:hidden">
          {navLinks()}
        </nav>
        <div aria-hidden="true" className="h-[3px] bg-[linear-gradient(90deg,#0b4a28,#13703d_35%,#ffc80c_70%,#e0a516)]" />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>

      <footer className="mt-10">
        <svg aria-hidden="true" className="block h-10 w-full sm:h-14" viewBox="0 0 1440 64" preserveAspectRatio="none">
          <path d="M0 22C260 54 520 64 790 52C1050 40 1250 14 1440 6V64H0Z" fill="#ffc80c" />
          <path d="M0 34C260 62 520 70 790 60C1050 50 1250 28 1440 20V64H0Z" fill="#0b4a28" />
        </svg>
        <div className="bg-[#0b4a28] px-4 pb-5 pt-1 text-center text-xs leading-6 text-white/75">
          <p>
            <span className="font-bold text-white">SISTer</span> <span className="mx-1">·</span> Sistem Informasi Sekolah Terpadu <span className="mx-1">·</span> {viewer.schoolName}
          </p>
          <p>Hak cipta © {new Date().getFullYear()} <span className="mx-1">·</span> Rouf Fadilah</p>
        </div>
      </footer>
    </div>
  );
}
