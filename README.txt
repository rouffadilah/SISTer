PEMBARUAN VISUAL SISTer

Isi:
- src/app/page.tsx
- src/app/globals.css
- src/app/layout.tsx
- src/components/SisterLogo.tsx
- public/images/sister-logo.png
- public/images/sister-background.png

Cara pasang:
1. Ekstrak ZIP.
2. Salin folder src dan public ke folder root project SISTer, lalu izinkan Replace untuk file yang sama.
3. Pastikan file src/lib/supabase/client.ts tetap ada; kode login tetap menggunakannya.
4. Pastikan file src/app/register/page.tsx tetap ada; CSS memakai kelas sister-auth-page, sister-auth-card, sister-register-card, sister-brand, sister-form, sister-auth-input, sister-auth-button, sister-switch, dan sister-auth-footer.
5. Jalankan npm run dev dan refresh browser dengan Ctrl+Shift+R.

Catatan: pembaruan ini mengganti latar belakang dengan gambar kampus tanpa form atau tulisan, dan memakai logo transparan dari referensi logo yang Anda kirim.
