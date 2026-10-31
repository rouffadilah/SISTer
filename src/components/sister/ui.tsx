import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Komponen tampilan bersama SISTer.
 * Warna tema (samakan bila membuat komponen baru):
 *   hijau tua  #0b4a28   hijau  #0e5a31   hijau muda (ubin) #eff7d2
 *   emas       #ffc80c   emas tua #e0a516  oranye (tautan) #f26a0f
 *   latar      #f6f7f1   teks   #1f2f27
 */

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Tombol                                                              */
/* ------------------------------------------------------------------ */
type ButtonVariant = "primary" | "secondary" | "gold" | "ghost";

export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[#0b4a28] text-white! shadow-lg shadow-[#0b4a28]/20 hover:bg-[#0e5a31] focus-visible:ring-[#0f5a31]/30",
    secondary: "border border-[#0b4a28]/15 bg-white text-[#0b4a28]! hover:border-[#0b4a28]/30 hover:bg-[#f4f8ec] focus-visible:ring-[#0f5a31]/20",
    gold: "bg-[#ffc80c] text-[#0b4a28]! shadow-lg shadow-[#e0a516]/25 hover:bg-[#ffd23d] focus-visible:ring-[#ffc80c]/40",
    ghost: "text-[#0b4a28]! hover:bg-[#eff7d2] focus-visible:ring-[#0f5a31]/20",
  };
  return cx(base, variants[variant], className);
}

export function ButtonLink({ href, variant = "primary", className, children }: { href: string; variant?: ButtonVariant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Lencana status                                                      */
/* ------------------------------------------------------------------ */
type BadgeTone = "green" | "gold" | "orange" | "red" | "slate";

const badgeTones: Record<BadgeTone, string> = {
  green: "bg-[#e3f1e0] text-[#0b4a28] ring-[#0b4a28]/10",
  gold: "bg-[#fff4cc] text-[#7a5600] ring-[#e0a516]/25",
  orange: "bg-[#ffeadb] text-[#b4480a] ring-[#f26a0f]/20",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function Badge({ tone = "green", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset", badgeTones[tone], className)}>{children}</span>;
}

/** Label dan warna untuk status keanggotaan sekolah. */
export function membershipStatus(status: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case "active":
      return { label: "Aktif", tone: "green" };
    case "pending":
      return { label: "Menunggu persetujuan", tone: "gold" };
    case "rejected":
      return { label: "Ditolak", tone: "red" };
    case "suspended":
    case "inactive":
      return { label: "Nonaktif", tone: "slate" };
    default:
      return { label: status, tone: "slate" };
  }
}

/* ------------------------------------------------------------------ */
/* Kartu dan ubin ikon                                                 */
/* ------------------------------------------------------------------ */
export function Card({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** true: isi kartu tanpa jarak tepi (untuk tabel) */
  flush?: boolean;
}) {
  return (
    <section className={cx("overflow-hidden rounded-[22px] border border-[#0b4a28]/[0.08] bg-white shadow-[0_18px_40px_-30px_rgba(12,58,32,0.55)]", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#0b4a28]/[0.07] px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-base font-extrabold text-[#123a25] sm:text-lg">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx(!flush && "px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eff7d2] text-[#0b4a28]", className)}>{children}</span>;
}

export function StatCard({ label, value, hint, icon, tone = "green" }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: "green" | "gold" | "orange" }) {
  const accent = { green: "text-[#0b4a28]", gold: "text-[#b07d00]", orange: "text-[#d85a05]" }[tone];
  const bar = { green: "bg-[#0e5a31]", gold: "bg-[#ffc80c]", orange: "bg-[#f26a0f]" }[tone];
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[#0b4a28]/[0.08] bg-white px-3.5 py-3 shadow-[0_14px_32px_-26px_rgba(12,58,32,0.6)] sm:rounded-[20px] sm:px-5 sm:py-4">
      <span aria-hidden="true" className={cx("absolute inset-y-4 left-0 w-1 rounded-r-full", bar)} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold leading-snug text-slate-500 sm:text-sm">{label}</p>
        {icon && <IconTile className="hidden h-10 w-10 rounded-xl sm:grid">{icon}</IconTile>}
      </div>
      <p className={cx("mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl", accent)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#0b4a28]/20 bg-[#fbfcf7] px-6 py-10 text-center">
      <p className="font-bold text-[#123a25]">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Judul halaman                                                       */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs && (
          <nav aria-label="Lokasi halaman" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="font-semibold text-[#0e5a31]! hover:text-[#f26a0f]!">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="text-sm font-extrabold uppercase tracking-wider text-[#e0a516]">{eyebrow}</p>}
        <h1 className="text-[clamp(24px,3.2vw,32px)] font-extrabold leading-tight tracking-tight text-[#0b4a28]">{title}</h1>
        <span aria-hidden="true" className="mt-2 block h-1 w-16 rounded-full bg-[linear-gradient(90deg,#ffc80c,#e0a516)]" />
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spanduk sambutan dengan foto gedung sekolah                         */
/* ------------------------------------------------------------------ */
export function HeroBanner({ eyebrow, title, description, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[26px] bg-[#0b4a28] text-white shadow-[0_24px_50px_-30px_rgba(8,54,29,0.8)]">
      <Image src="/images/latar-login.jpg" alt="" fill preload sizes="(min-width: 1280px) 1216px, 100vw" className="-z-20 object-cover object-[100%_42%]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#0b4a28_0%,rgba(11,74,40,0.96)_38%,rgba(11,74,40,0.72)_62%,rgba(11,74,40,0.25)_100%)]" />
      <div className="max-w-2xl px-6 py-8 sm:px-10 sm:py-10">
        {eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffc80c] sm:text-sm">{eyebrow}</p>}
        <h1 className="mt-2 text-[clamp(24px,3.4vw,36px)] font-extrabold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-6 text-white/85 sm:text-base">{description}</p>}
        {children && <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-[linear-gradient(90deg,#ffc80c,#e0a516_45%,#ffc80c)]" />
    </section>
  );
}
