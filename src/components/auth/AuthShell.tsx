import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { nunito } from "@/components/sister/fonts";

/* ------------------------------------------------------------------ */
/* Latar halaman: foto gedung, langit, dan gelombang hijau-emas.       */
/* File: public/images/latar-login.jpg (sisi kiri sengaja kosong/putih */
/* agar slogan dan nilai sekolah bisa diletakkan di atasnya).          */
/* ------------------------------------------------------------------ */
function AuthBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Image
        src="/images/latar-login.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-[82%_100%] lg:object-[100%_100%]"
      />
      {/* sisi kiri tetap terang agar slogan terbaca di layar yang lebih sempit */}
      <div
        className="absolute inset-y-0 left-0 hidden w-[36%] bg-[linear-gradient(to_right,#fdfdf9_0%,#fdfdf9_25%,rgba(253,253,249,0.85)_55%,rgba(253,253,249,0)_100%)] xl:block"
        style={{ maskImage: "linear-gradient(to bottom, #000 68%, transparent 78%)", WebkitMaskImage: "linear-gradient(to bottom, #000 68%, transparent 78%)" }}
      />
      <Image
        src="/images/daun-kiri-atas.png"
        alt=""
        width={271}
        height={389}
        className="absolute left-0 top-0 h-auto w-[clamp(56px,8.5vw,136px)]"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deretan logo dalam kotak putih membulat.                            */
/* Ganti file di public/images/logo/ dengan logo resmi (nama sama).    */
/* ------------------------------------------------------------------ */
const logoHeight = "h-[var(--auth-logo-h)]";

function SchoolLogos() {
  return (
    <div className="mx-auto flex max-w-full shrink-0 items-center justify-center gap-[clamp(8px,2.4vw,52px)] rounded-[clamp(16px,3dvh,36px)] bg-white px-[clamp(12px,3vw,52px)] py-[clamp(6px,1.2dvh,16px)] shadow-[0_12px_32px_-14px_rgba(16,64,40,0.4)]">
      <Image src="/images/logo/yayasan-permata-sari.png" alt="Logo Yayasan Permata Sari" width={269} height={262} className={`${logoHeight} w-auto`} />
      <Image src="/images/logo/sma-islam-cikal-harapan-1.png" alt="SMA Islam Cikal Harapan 1 — Yayasan Permata Sari" width={750} height={258} className={`${logoHeight} w-auto`} />
      <Image src="/images/logo/ummi.png" alt="Logo Ummi" width={293} height={290} className={`${logoHeight} w-auto`} />
      <Image src="/images/logo/adiwiyata.png" alt="Logo Adiwiyata" width={276} height={260} className={`${logoHeight} w-auto`} />
      <Image src="/images/logo/50-tahun-yps.png" alt="Logo 50 Tahun Yayasan Permata Sari" width={350} height={296} className={`${logoHeight} w-auto`} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slogan dan nilai sekolah di sisi kiri (layar ≥ 1280 px).            */
/* ------------------------------------------------------------------ */
const schoolValues = [
  { label: ["Berkarakter"], icon: "/images/nilai/berkarakter.png", width: 212, height: 136 },
  { label: ["Mandiri"], icon: "/images/nilai/mandiri.png", width: 189, height: 163 },
  { label: ["Peduli", "Sesama"], icon: "/images/nilai/peduli-sesama.png", width: 194, height: 186 },
];

function SchoolValues() {
  return (
    <aside className="hidden w-full max-w-[400px] justify-self-start xl:block">
      <Image src="/images/slogan.png" alt="Bersama Membangun Bangsa" width={718} height={504} className="h-[clamp(120px,25dvh,250px)] w-auto max-w-full object-contain object-left" />
      <ul className="mt-[clamp(12px,2.4dvh,28px)] space-y-[clamp(10px,2dvh,24px)]">
        {schoolValues.map(({ label, icon, width, height }) => (
          <li key={label.join(" ")} className="flex items-center gap-[clamp(12px,1.4vw,22px)]">
            <span className="grid aspect-[123/96] w-[clamp(60px,min(7.6vw,11dvh),122px)] shrink-0 place-items-center rounded-[clamp(12px,1.8dvh,20px)] bg-[#eff7d2]">
              <Image src={icon} alt="" width={width} height={height} className="h-[74%] w-auto" />
            </span>
            <span aria-hidden="true" className="h-[clamp(40px,min(5vw,7.3dvh),80px)] w-[5px] shrink-0 rounded-full bg-[#ffc80c]" />
            <span className="text-[clamp(18px,min(2.15vw,3.4dvh),34px)] font-extrabold leading-[1.15] text-[#0b4a22]">
              {label.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Ukuran yang menyesuaikan layar.                                     */
/* Semua ukuran utama mengikuti tinggi layar (dvh) dengan batas min/maks */
/* sehingga halaman muat satu layar di laptop maupun ponsel.          */
/* Ubah angka di sini bila ingin tampilan sedikit lebih besar/kecil.  */
/* ------------------------------------------------------------------ */
const fluidSizes = {
  "--auth-logo-h": "clamp(26px, min(8.4vw, 8dvh), 100px)", // logo di kotak atas
  "--auth-brand-h": "clamp(62px, 12.5dvh, 124px)", // logo SISTer di kartu
  "--auth-card-py": "clamp(16px, 3dvh, 32px)", // jarak atas/bawah dalam kartu
  "--auth-space": "clamp(12px, 2.6dvh, 28px)", // jarak antarbagian
  "--auth-field-h": "clamp(40px, 6.2dvh, 52px)", // tinggi kolom isian (masuk)
  "--auth-field-h-compact": "clamp(34px, 5.2dvh, 44px)", // tinggi kolom isian (daftar)
  "--auth-button-h": "clamp(42px, 6.4dvh, 54px)", // tinggi tombol
  "--auth-stack": "clamp(10px, 1.8dvh, 16px)", // jarak antarkolom (masuk)
  "--auth-stack-compact": "clamp(6px, 1.1dvh, 10px)", // jarak antarkolom (daftar)
} as CSSProperties;

/* Halaman daftar punya lebih banyak kolom, jadi logo & jarak sedikit dirapatkan. */
const compactSizes = {
  "--auth-brand-h": "clamp(52px, 10dvh, 112px)",
  "--auth-card-py": "clamp(14px, 2.6dvh, 30px)",
  "--auth-space": "clamp(10px, 2dvh, 26px)",
} as CSSProperties;

/* ------------------------------------------------------------------ */
/* Kerangka halaman autentikasi (login & daftar).                      */
/* ------------------------------------------------------------------ */
type AuthShellProps = {
  title: string;
  children: ReactNode;
  /** true untuk formulir panjang (halaman daftar) */
  compact?: boolean;
};

export default function AuthShell({ title, children, compact = false }: AuthShellProps) {
  return (
    <main style={compact ? { ...fluidSizes, ...compactSizes } : fluidSizes} className={`${nunito.className} relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#fdfdf9] text-[#1f2f27]`}>
      <AuthBackground />
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-4 pb-[clamp(16px,4dvh,96px)] pt-[clamp(10px,2dvh,28px)] sm:px-6 lg:px-[clamp(32px,4vw,72px)]">
        <SchoolLogos />
        {/* Kartu selalu di tengah; pada layar lebar slogan & nilai mengisi kolom kiri. */}
        <div className="mt-[var(--auth-space)] flex flex-1 flex-col items-center justify-center xl:grid xl:grid-cols-[minmax(0,1fr)_440px_minmax(0,1fr)] xl:gap-10">
          <SchoolValues />
          <section aria-labelledby="auth-title" className="w-full max-w-[440px] rounded-[clamp(20px,3.2dvh,26px)] bg-white px-[clamp(20px,5vw,32px)] py-[var(--auth-card-py)] shadow-[0_30px_70px_-28px_rgba(12,58,32,0.5),0_2px_6px_rgba(12,58,32,0.08)] ring-1 ring-black/[0.04] xl:col-start-2">
            <Image src="/images/sister-logo.png" alt="SISTer" width={676} height={272} preload className="mx-auto h-[var(--auth-brand-h)] w-auto max-w-[86%] object-contain" />
            <div className="mt-[clamp(2px,0.6dvh,6px)] flex items-center gap-2.5">
              <span className="h-[3px] flex-1 rounded-full bg-gradient-to-l from-[#e0a516] to-transparent" />
              <span className="text-[clamp(12px,1.9dvh,14px)] font-extrabold tracking-tight text-[#163a28]">Sistem Informasi Sekolah Terpadu</span>
              <span className="h-[3px] flex-1 rounded-full bg-gradient-to-r from-[#e0a516] to-transparent" />
            </div>
            <h1 id="auth-title" className="sr-only">{title}</h1>
            <div className="mt-[var(--auth-space)]">{children}</div>
            <footer className="mt-[var(--auth-space)] border-t border-slate-200 pt-[clamp(8px,1.6dvh,16px)] text-center text-[clamp(11.5px,1.75dvh,13px)] leading-[1.8] text-slate-500">
              <p>SISTer <span className="mx-1">·</span> Sistem Informasi Sekolah Terpadu</p>
              <p>Hak cipta © {new Date().getFullYear()} <span className="mx-1">·</span> Rouf Fadilah</p>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
