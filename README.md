# SISTer — patch inti Next.js + Supabase

Paket ini berisi kode pengganti untuk halaman login, pendaftaran mandiri, dashboard, manajemen pengguna, komponen logo, gaya visual, route logout, dan migrasi SQL untuk alur **daftar → menunggu persetujuan administrator → aktif**.

> Ini bukan salinan seluruh repository Anda karena kode lokal yang sedang dipakai tidak diunggah ke percakapan. Gabungkan file yang ada dalam paket ini dengan project `SISTer`; jangan menimpa modul lain yang tidak tercantum.

## 1. File yang diganti/ditambahkan

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx` — login
- `src/app/register/page.tsx` — pendaftaran
- `src/app/dashboard/page.tsx`
- `src/app/users/page.tsx` — daftar pengguna dan persetujuan
- `src/app/users/ApproveMembershipButton.tsx`
- `src/app/auth/signout/route.ts`
- `src/components/SisterLogo.tsx`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/app/icon.svg`
- `public/images/sister-logo.svg`
- `public/images/sister-background.svg` — ilustrasi latar tanpa form
- `supabase/sister_security_migration.sql`

## 2. Dependensi

Di folder project SISTer jalankan:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Project harus sudah menggunakan Next.js App Router, TypeScript, dan alias `@/*`.

## 3. Environment

Pastikan `.env.local` pada root project memuat nilai project Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GANTI_DENGAN_KEY_ANDA
```

Gunakan URL dan publishable key milik project sendiri. Jangan pernah menaruh `service_role` key pada variabel `NEXT_PUBLIC_*` atau pada kode browser.

Setelah mengubah `.env.local`, restart server Next.js.

## 4. Database dan RLS

1. Buka Supabase → SQL Editor.
2. Pastikan tabel `schools`, `profiles`, `school_memberships`, `roles`, dan `membership_roles` sudah ada.
3. Pastikan kolom `profiles.email`, `profiles.full_name`, `school_memberships.requested_role`, `school_memberships.status`, `school_memberships.school_id`, dan `school_memberships.user_id` tersedia.
4. Pastikan sekolah memiliki slug `sma-islam-cikal-harapan-1` dan role dasar sudah ada dengan kode `school_admin`, `teacher`, `student`, `staff`, `principal`, `parent`, `homeroom_teacher`, `counselor`, dan `finance`.
5. Baca `supabase/sister_security_migration.sql`, lalu jalankan di SQL Editor. Jika project memiliki constraint/kolom yang berbeda, sesuaikan sebelum menjalankan.

SQL membuat trigger pendaftaran. Role dari form hanya disimpan sebagai `requested_role`; pengguna tidak dapat memberi dirinya role aktif. Hanya fungsi RPC yang memeriksa administrator aktif yang dapat menyetujui keanggotaan.

## 5. Jalankan dan uji

```bash
npm run dev
```

Buka `http://localhost:3000` dan `http://localhost:3000/register`.

Uji dengan alamat email baru (jangan menguji pendaftaran memakai email admin yang sudah terdaftar). Akun baru seharusnya mendapat status `pending`. Login pengguna pending diarahkan ke layar menunggu persetujuan. Admin aktif membuka `/users`, lalu menyetujui permintaan.

## 6. Catatan desain

Latar SVG dalam paket ini adalah ilustrasi kampus generik dengan warna hijau tua, emas, dan putih, tanpa form tertanam. Gambar mockup lama yang memuat form tidak digunakan sebagai background agar form tidak tampil dua kali. Anda dapat mengganti `public/images/sister-background.svg` dengan foto gedung sekolah yang Anda miliki, tanpa mockup form, dan tetap memakai nama file yang sama.
