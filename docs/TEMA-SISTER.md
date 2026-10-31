# Panduan Tema SISTer

Semua halaman SISTer memakai satu tema yang sama dengan halaman Masuk/Daftar:
hijau tua dan emas, latar krem, huruf **Nunito**, kartu putih membulat, dan logo SISTer.
Ikuti panduan ini setiap kali membuat halaman baru — baik ditulis sendiri maupun dibuat dengan bantuan AI.

## 1. Warna

| Nama | Kode | Dipakai untuk |
|---|---|---|
| Hijau tua | `#0b4a28` | tombol utama, judul halaman, header tabel teks |
| Hijau | `#0e5a31` | hover tombol, garis aksen |
| Hijau muda (ubin) | `#eff7d2` | latar ikon, header tabel, menu aktif |
| Emas | `#ffc80c` | garis aksen, tombol emas, inisial avatar |
| Emas tua | `#e0a516` | label kecil (eyebrow), garis di bawah judul |
| Oranye | `#f26a0f` | tautan seperti "Daftar di sini", "Buka modul →" |
| Latar halaman | `#f6f7f1` | latar semua halaman setelah login |
| Teks | `#1f2f27` | teks utama; teks sekunder pakai `text-slate-500/600` |

Jangan memakai warna lain (mis. indigo/ungu) untuk elemen utama.

## 2. Komponen yang sudah tersedia

| File | Isi |
|---|---|
| `src/components/sister/AppShell.tsx` | Kerangka halaman setelah login: header (logo, menu, nama & peran, tombol Keluar), pola Islami, footer gelombang hijau-emas. Menu baru ditambahkan di `navItems`. |
| `src/components/sister/ui.tsx` | `PageHeader`, `HeroBanner`, `Card`, `StatCard`, `IconTile`, `Badge`, `ButtonLink`, `buttonClasses()`, `EmptyState`, `membershipStatus()` |
| `src/components/sister/fonts.ts` | Huruf Nunito |
| `src/lib/sister/viewer.ts` | `getViewer()` — data pengguna yang sedang masuk (nama, email, peran, admin atau bukan, sekolah). Otomatis mengalihkan ke login bila belum masuk. |
| `src/components/auth/` | Halaman Masuk/Daftar (`AuthShell`, kolom isian, ikon). Ikon garis ada di `icons.tsx`. |

## 3. Membuat halaman baru

```tsx
// src/app/presensi/page.tsx
import AppShell from "@/components/sister/AppShell";
import { Card, PageHeader, ButtonLink } from "@/components/sister/ui";
import { getViewer } from "@/lib/sister/viewer";

export default async function PresensiPage() {
  const viewer = await getViewer();

  return (
    <AppShell viewer={viewer} active="presensi">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Presensi" }]}
        title="Presensi"
        description="Kehadiran harian siswa per kelas."
        actions={<ButtonLink href="/presensi/baru">Isi presensi</ButtonLink>}
      />
      <Card title="Hari ini" className="mt-6">
        ...
      </Card>
    </AppShell>
  );
}
```

Lalu tambahkan menunya di `navItems` dalam `AppShell.tsx`:

```tsx
{ key: "presensi", label: "Presensi", href: "/presensi", icon: <ClockIcon className="h-[18px] w-[18px]" /> },
```

## 4. Aturan tampilan

- **Setiap halaman setelah login dibungkus `AppShell`.** Jangan membuat header sendiri.
- Judul halaman memakai `PageHeader`; isi dikelompokkan dalam `Card`.
- Tombol utama: `ButtonLink`/`buttonClasses("primary")` (hijau). Aksi sekunder: `"secondary"`. Ajakan menonjol di atas latar hijau: `"gold"`.
- Tautan teks berwarna oranye `#f26a0f`.
- Status memakai `Badge`: hijau = aktif/berhasil, emas = menunggu, merah = ditolak/gagal, abu-abu = lainnya.
- Tabel: bungkus dengan `<Card flush>`, header tabel `bg-[#eff7d2] text-[#0b4a28]`, baris `hover:bg-[#fafcf4]`, wadah `overflow-x-auto` agar bisa digeser di ponsel.
- Ikon fitur ditaruh di `IconTile` (ubin hijau muda).
- Semua teks antarmuka dalam bahasa Indonesia.
- Uji di ponsel (±390 px) dan laptop (±1366 px). Halaman Masuk/Daftar memakai ukuran yang menyesuaikan tinggi layar (`fluidSizes` di `AuthShell.tsx`).

## 5. Catatan teknis

- Warna penting diberi tanda `!` (mis. `text-white!`) agar tidak tertimpa aturan `a { color: … }` di `globals.css`.
  Jika menambah aturan ke `globals.css`, letakkan di dalam `@layer base { … }` supaya kelas Tailwind tetap bisa menimpanya.
- Gambar tema ada di `public/images/` (lihat `README-ID.md`).
