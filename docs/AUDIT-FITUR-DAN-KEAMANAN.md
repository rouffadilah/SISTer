# Audit Fitur dan Risiko SISTer

Tanggal audit: 21 November 2026  
Basis audit: struktur repository dan source code pada branch `main`.

## Ringkasan

SISTer sudah memiliki fondasi autentikasi Supabase SSR, dashboard, pendaftaran akun, persetujuan admin, manajemen pengguna, serta modul Kelas & Siswa. RLS sudah digunakan pada tabel inti dan fungsi `SECURITY DEFINER` membatasi pemeriksaan keanggotaan/peran.

Audit ini tidak menyalin kode proprietary dari sistem lain. Pola SIDIGS dipakai hanya sebagai daftar kebutuhan sekolah yang perlu diprioritaskan.

## Matriks cakupan

| Alur sekolah | Status di repository | Catatan aman |
|---|---|---|
| Dashboard | Ada | Pertahankan `AppShell`, `getViewer()`, dan komponen UI bersama. |
| Akademik/rapor | Belum ditemukan modul khusus | Rancang skema akademik setelah definisi periode, mata pelajaran, dan aturan publikasi disepakati. |
| Presensi | MVP pada branch ini | Pencatatan transaksional dengan pemeriksaan revisi; rekam historis memakai snapshot nama. Terapkan `supabase/presensi.sql` di Supabase sebelum digunakan. |
| Keuangan/SPP | Belum ditemukan modul khusus | Jangan menyimpan atau mengekspos data pembayaran sebelum kebutuhan audit dan peran keuangan ditetapkan. |
| CBT | Belum ditemukan modul khusus | Pisahkan bank soal, attempt, dan hasil; jangan membuka kunci jawaban melalui query klien. |
| LMS | Belum ditemukan modul khusus | Tambahkan setelah model kelas dan siswa stabil. |
| SPMB | Belum ditemukan modul khusus | Alur publik perlu dipisahkan dari data internal dan diberi rate limiting di deployment. |
| Portal orang tua/notifikasi | Role `parent` tersedia, portal belum ditemukan | Hubungkan orang tua ke siswa melalui tabel relasi khusus, bukan berdasarkan email saja. |
| Analitik | Belum ditemukan modul khusus | Mulai dari view/RPC agregat yang mengikuti RLS, bukan menyalin data sensitif ke klien. |
| Kelas & Siswa | Ada | RLS membatasi baca/tulis; admin sekolah menjadi satu-satunya peran mutasi. |

## Temuan keamanan

- `sister_security_migration.sql` memakai `SECURITY DEFINER` dengan `search_path = ''`, revoke/grant eksplisit, dan pemeriksaan admin berbasis sekolah. Ini adalah pola yang tepat, tetapi migrasi aktif di Supabase tetap harus diverifikasi karena repository tidak dapat memastikan trigger/policy yang sudah terpasang di project.
- `kelas-siswa.sql` membatasi mutasi `classes` dan `students` ke `school_admin`, serta memvalidasi bahwa `class_id` berasal dari sekolah yang sama.
- `getViewer()` membaca membership aktif dan role dari database. Route/page tetap perlu memeriksa `isAdmin`/`isStaff` sebelum menampilkan aksi sensitif; RLS harus tetap menjadi batas terakhir.
- Mutasi presensi hanya melalui RPC `SECURITY DEFINER` yang memeriksa peran dan kelas, mengunci sesi/kelas, serta menolak revisi kedaluwarsa. Tabel presensi hanya memberi role authenticated akses baca langsung; validasi matrix RLS tetap wajib dilakukan di staging.
- `src/proxy.ts` hanya menyegarkan sesi. Proxy bukan pengganti otorisasi halaman atau RLS.
- Tidak ada secret yang ditambahkan. Nilai Supabase tetap berasal dari environment variable.

## Prioritas implementasi bertahap

1. Terapkan dan uji migrasi presensi di staging, termasuk matrix akses RLS.
2. Akademik dasar: periode, mata pelajaran, enrollment, nilai, dan publikasi hasil.
3. Keuangan/SPP sebagai modul terpisah dengan role finance dan audit log.
4. Portal orang tua setelah relasi parent-student dan kebijakan data disepakati.
5. CBT/LMS/SPMB/analitik setelah fondasi data dan observability tersedia.

## Verifikasi yang masih diperlukan

- Jalankan migrasi Supabase di staging dan periksa policy/trigger aktif melalui SQL introspection.
- Uji matrix akses presensi untuk admin sekolah, wali kelas yang ditugaskan, guru lain, siswa, dan akun pending; uji dua penyimpanan bersamaan dan perubahan roster historis.
- Jalankan `npm run lint`, `npm run typecheck`, dan `npm run build` pada checkout dengan dependency terpasang.
- Tambahkan test integration untuk RPC approval dan RLS sebelum menambah modul finansial atau portal orang tua.
