# Mengonlinekan SISTer (GitHub + Vercel + Supabase)

SISTer memakai Next.js 16 dan Supabase. Cara termudah mengonlinekannya adalah **Vercel**
(pembuat Next.js) yang terhubung ke repositori **GitHub**. Setelah tersambung, setiap kali kode
di-*push* ke GitHub, Vercel otomatis memperbarui situs.

> Paket gratis Vercel (Hobby) hanya untuk penggunaan pribadi/non-komersial — cocok untuk uji coba
> dan prototipe. Untuk dipakai resmi oleh sekolah, pertimbangkan paket Pro atau hosting milik sekolah.

## 1. Cek di komputer sendiri

```bash
npm run build
```

Kalau berhasil tanpa error, lanjut. Kalau gagal, perbaiki dulu — Vercel menjalankan perintah yang sama.

## 2. Unggah kode ke GitHub (repositori privat)

Di VS Code: menu **Source Control** → **Publish to GitHub** → pilih **Private repository**.
File `.env.local`, `node_modules`, dan `.next` otomatis tidak ikut (sudah ada di `.gitignore`).

Atau lewat terminal setelah membuat repositori kosong `sister` di github.com:

```bash
git add -A
git commit -m "SISTer siap online"
git branch -M main
git remote add origin https://github.com/<akun-anda>/sister.git
git push -u origin main
```

## 3. Buat proyek di Vercel

1. Buka <https://vercel.com>, masuk dengan **Continue with GitHub**.
2. **Add New… → Project**, pilih repositori `sister`, klik **Import**. Framework terdeteksi otomatis sebagai Next.js.
3. Buka **Environment Variables**, isi tiga variabel (salin nilainya dari `.env.local`):

| Nama | Isi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key Supabase |
| `NEXT_PUBLIC_SCHOOL_SLUG` | `sma-islam-cikal-harapan-1` |

4. Klik **Deploy**. Setelah ±2 menit, situs tersedia di alamat seperti `https://sister-xxxx.vercel.app`.

> Jangan pernah memasukkan `service_role` key ke Vercel sebagai variabel `NEXT_PUBLIC_*`.

## 4. Atur alamat situs di Supabase

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: alamat Vercel, mis. `https://sister-xxxx.vercel.app`
- **Redirect URLs**: tambahkan `https://sister-xxxx.vercel.app/**` (biarkan `http://localhost:3000/**` untuk pengembangan)

Tanpa langkah ini, tautan verifikasi email pendaftar akan mengarah ke `localhost`.

## 5. Uji

Buka alamat situs di laptop dan ponsel: daftar akun baru, buka tautan verifikasi di email,
masuk, lalu cek Dashboard dan Manajemen Pengguna.

## 6. Pembaruan berikutnya

Ubah kode → `git commit` → `git push`. Vercel otomatis membangun dan mengonlinekan versi baru.
Riwayat dan log build ada di tab **Deployments** proyek Vercel.

## 7. (Opsional) Alamat sendiri

Vercel → proyek → **Settings → Domains**, tambahkan mis. `sister.namasekolah.sch.id`,
lalu minta pengelola domain sekolah menambahkan catatan DNS yang ditunjukkan Vercel.
Jangan lupa memperbarui **Site URL** dan **Redirect URLs** di Supabase ke alamat baru.

## Catatan teknis

- `src/proxy.ts` memperbarui sesi login Supabase di setiap navigasi (pengganti `middleware.ts` di Next.js 16),
  sehingga pengguna tidak tiba-tiba keluar setelah token kedaluwarsa.
- Huruf Nunito diunduh dari Google Fonts saat build; server Vercel punya akses internet, jadi tidak perlu diatur.
