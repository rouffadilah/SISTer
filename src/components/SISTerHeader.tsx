import Image from "next/image";
import Link from "next/link";

/*
 * Header sederhana bertema SISTer (versi lama, untuk halaman yang belum memakai AppShell).
 * Halaman baru sebaiknya memakai `AppShell` dari `@/components/sister/AppShell`.
 * Komponen ini sengaja tidak mengimpor SisterLogo agar tidak bergantung pada nama file logo.
 */

type SISTerHeaderProps = {
  /** menu yang sedang aktif: "dashboard" atau "users" */
  active?: string;
  /** tampilkan menu Manajemen Pengguna (default: ya) */
  showUsersLink?: boolean;
};

const link = "rounded-xl px-3 py-2 text-sm font-bold transition";

export default function SISTerHeader({ active, showUsersLink = true }: SISTerHeaderProps) {
  const cls = (key: string) => `${link} ${active === key ? "bg-[#eff7d2] text-[#0b4a28]!" : "text-slate-600! hover:bg-[#f4f8ec] hover:text-[#0b4a28]!"}`;
  return (
    <header className="sticky top-0 z-40 border-b border-[#0b4a28]/[0.08] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link href="/dashboard" aria-label="SISTer — Dashboard" className="shrink-0">
          <Image src="/images/sister-logo.png" alt="SISTer" width={676} height={272} className="h-10 w-auto lg:h-12" />
        </Link>
        <nav aria-label="Menu utama" className="ml-auto flex items-center gap-1 overflow-x-auto">
          <Link href="/dashboard" className={cls("dashboard")}>Dashboard</Link>
          {showUsersLink && <Link href="/users" className={cls("users")}>Manajemen Pengguna</Link>}
        </nav>
        <form action="/auth/signout" method="post">
          <button type="submit" suppressHydrationWarning className="rounded-xl bg-[#0b4a28] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0e5a31]">
            Keluar
          </button>
        </form>
      </div>
      <div aria-hidden="true" className="h-[3px] bg-[linear-gradient(90deg,#0b4a28,#13703d_35%,#ffc80c_70%,#e0a516)]" />
    </header>
  );
}
