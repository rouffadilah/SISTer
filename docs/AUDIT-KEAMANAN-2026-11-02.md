# SISTer — Audit Statis Keamanan dan Alur Pendaftaran

Tanggal pemeriksaan: 2026-11-02  
Branch: `audit/security-review-2026-11`  
Cakupan: tinjauan statis kode di `main`; belum menjalankan aplikasi atau mengakses skema database Supabase yang aktif.

## Ringkasan

Jangan anggap aplikasi siap produksi sebelum memeriksa skema Supabase aktif dan menguji alur pendaftaran serta otorisasi. Dokumen ini mencatat masalah yang terlihat dari source code; bukan hasil penetration test.

## Temuan

### P1 — Pilihan peran pendaftaran tidak konsisten dengan kebijakan persetujuan

File: `src/app/register/page.tsx`, `supabase/sister_security_migration.sql`, `supabase/admin-approval.sql`, `supabase/membership-trigger.sql`.

- Formulir pendaftaran menawarkan `vice_principal`, `finance`, dan `it_admin`.
- Fungsi `sister_handle_new_user()` tidak mengizinkan `vice_principal`; permintaan tersebut akan diubah menjadi `student`.
- Fungsi `admin_review_membership()` mengizinkan `vice_principal`, tetapi tidak mengizinkan `finance` atau `it_admin`.
- Fungsi `sister_approve_membership()` memiliki daftar peran berbeda dan menolak peran istimewa.

Dampak: pengguna dapat mengajukan peran yang akhirnya ditolak atau diubah diam-diam. `it_admin` juga tidak boleh diberikan melalui pendaftaran publik.

Tindakan: tetapkan satu daftar peran self-registration yang eksplisit. Peran istimewa harus ditetapkan melalui prosedur administratif terpisah; jangan mengubah permintaan peran secara diam-diam.

### P1 — Beberapa jalur trigger dapat membuat keanggotaan ganda

File: `supabase/membership-trigger.sql`, `supabase/sister_security_migration.sql`.

- `membership-trigger.sql` memasang trigger `on_auth_user_created_profile` untuk membuat profil dan `on_auth_user_created_membership` untuk membuat keanggotaan.
- `sister_security_migration.sql` memasang trigger lain bernama `on_auth_user_created` yang juga membuat profil dan keanggotaan.

Jika kedua skrip diterapkan pada database yang sama, satu pendaftaran dapat memicu kedua jalur pembuatan keanggotaan. `ON CONFLICT DO NOTHING` hanya mencegah duplikasi bila constraint unik yang sesuai memang ada.

Tindakan: periksa trigger aktif di Supabase sebelum mengubah apa pun. Pilih satu implementasi kanonis, pastikan constraint unik pada kombinasi sekolah dan pengguna, lalu uji pada database staging.

### P1 — Dua fungsi persetujuan memiliki perilaku berbeda

File: `supabase/admin-approval.sql`, `supabase/sister_security_migration.sql`.

- `admin_review_membership(uuid, text)` mendukung approve/reject.
- `sister_approve_membership(uuid)` hanya mendukung approve.
- Kedua fungsi memakai daftar peran yang berbeda dan nama helper admin yang berbeda (`is_school_admin` dan `sister_is_school_admin`).

Dampak: perilaku persetujuan dapat bergantung pada RPC mana yang dipanggil UI serta migrasi mana yang aktif.

Tindakan: pilih satu RPC kanonis, pastikan semua pemanggil menggunakannya, dan batasi pemberian peran berdasarkan kebijakan sekolah.

### P1 — RLS dan grant tidak bisa diverifikasi hanya dari repository

Skrip migrasi mengasumsikan tabel, kolom, constraint, kebijakan, dan role tertentu sudah tersedia. Source code tidak membuktikan konfigurasi yang benar-benar aktif di proyek Supabase.

Tindakan: ambil inventaris skema/trigger/policy aktif melalui Supabase SQL Editor. Jangan jalankan skrip gabungan pada produksi sebelum ditinjau.

### P2 — Penanganan error dan efisiensi query

File: `src/app/users/page.tsx`, `src/lib/sister/viewer.ts`.

- Kegagalan kueri profil dan role tidak seluruhnya ditampilkan sebagai error.
- Halaman pengguna mengambil assignment role dalam loop per keanggotaan, yang berpotensi menambah jumlah query saat data membesar.
- `getViewer()` juga melakukan query berulang untuk sekolah dan role per membership.

Tindakan: tangani error secara eksplisit dan pertimbangkan pengambilan data secara batch setelah perilaku RLS dipastikan benar.

## Urutan tindakan yang aman

1. Jangan jalankan migrasi tambahan di produksi dulu.
2. Di Supabase SQL Editor, inventarisasi trigger pada `auth.users`, fungsi terkait pendaftaran/persetujuan, constraint unik `school_memberships`, RLS, policies, dan grants.
3. Pilih satu trigger pendaftaran dan satu RPC persetujuan yang kanonis.
4. Satukan daftar peran dan pertahankan pemisahan antara requested role dan role aktif.
5. Uji dengan akun dummy di staging: pendaftaran, verifikasi email, status pending, approve/reject, akses lintas sekolah, dan penolakan eskalasi hak akses.
6. Jalankan `npm run lint` dan `npm run build`; belum ada hasil kedua perintah tersebut dalam audit ini.

## Batas audit

Belum dilakukan: eksekusi build/lint, pengujian runtime, pemeriksaan database Supabase aktif, pemindaian dependency, atau penetration test. Tidak ada perubahan database atau kredensial yang dilakukan.
