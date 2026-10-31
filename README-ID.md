# SISTer — paket pembaruan identitas dan halaman utama

Paket ini berisi file pengganti untuk identitas SISTer, logo SVG berbasis komponen, header internal, login, registrasi, dashboard, dan daftar pengguna.

## File yang disalin
Salin folder `src/components` dan file halaman dalam `src/app` ke proyek Next.js yang sudah ada. Jangan menimpa helper Supabase yang sudah berfungsi (`src/lib/supabase/client.ts` dan `src/lib/supabase/server.ts`). Halaman mengasumsikan helper tersebut tetap tersedia.

## Konfigurasi
Tambahkan `NEXT_PUBLIC_SCHOOL_SLUG=sma-islam-cikal-harapan-1` ke `.env.local`, lalu restart server development (`Ctrl+C`, kemudian `npm run dev`). Jangan pernah memasukkan `service_role` key ke variabel `NEXT_PUBLIC_*`.

## Pendaftaran mandiri + persetujuan admin
1. Pastikan tabel `school_memberships` memiliki kolom `requested_role` bertipe `text`, serta kolom `status`.
2. Jalankan `supabase/membership-trigger.sql` di Supabase SQL Editor. Trigger membuat keanggotaan `pending` pada saat akun dibuat.
3. Pastikan RLS aktif. Pengguna biasa tidak boleh mengubah status `pending` menjadi `active` atau memberi dirinya role administrator.
4. Untuk menampilkan nama dan email pada Manajemen Pengguna, pastikan tabel `profiles` memiliki `id`, `full_name`, dan `email`, dan kebijakan SELECT administrator sudah tersedia. Jika kolom `profiles.email` belum ada, tambahkan kolom itu atau sesuaikan query di `src/app/users/page.tsx`.
5. Pastikan GRANT SELECT untuk role `authenticated` tersedia pada tabel yang dipakai, sementara RLS tetap membatasi baris yang bisa dibaca.

## Catatan integrasi
- Logo merupakan SVG inline; tidak memerlukan file gambar eksternal.
- Login menggunakan Supabase `signInWithPassword`.
- Pendaftaran menyimpan jenis pengguna sebagai permintaan, bukan sebagai hak akses final.
- Pastikan `src/app/auth/signout/route.ts` tersedia jika tombol keluar menggunakan endpoint `/auth/signout`. Jika proyek belum memilikinya, buat file route tersebut menggunakan `createClient` dari helper server dan `supabase.auth.signOut()`.
- Uji terlebih dahulu di lokal sebelum deployment.

## Tampilan halaman Masuk & Daftar
Kerangka halaman login (`/`) dan daftar (`/register`) ada di `src/components/auth/AuthShell.tsx`; kolom isian di `src/components/auth/AuthFields.tsx`.

Gambar yang dipakai (dipotong dari desain latar — boleh diganti dengan file asli memakai **nama file yang sama**):
- `public/images/latar-login.jpg` — foto gedung, langit, dan gelombang hijau-emas. Sisi kirinya sengaja dibiarkan putih karena slogan dan nilai sekolah ditampilkan di atasnya.
- `public/images/daun-kiri-atas.png` — hiasan daun di pojok kiri atas.
- `public/images/slogan.png` — tulisan "Bersama Membangun Bangsa" beserta garis emasnya.
- `public/images/nilai/` — ikon `berkarakter.png`, `mandiri.png`, `peduli-sesama.png`. Teks nilai bisa diubah di `schoolValues` dalam `AuthShell.tsx`.
- `public/images/logo/` — `yayasan-permata-sari.png`, `sma-islam-cikal-harapan-1.png`, `ummi.png`, `adiwiyata.png`, `50-tahun-yps.png` (PNG latar transparan).
- `public/images/sister-logo.png` — logo SISTer di kartu.

File lama `public/images/gedung-sekolah.jpg` dan `public/images/logo/logo-alquran.png` sudah tidak dipakai dan boleh dihapus.

Huruf Nunito dimuat otomatis lewat `next/font/google`, jadi komputer perlu terhubung internet saat `npm run dev`/`npm run build` pertama kali.
