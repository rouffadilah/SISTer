<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tema tampilan SISTer

Setiap halaman baru wajib mengikuti tema SISTer (hijau tua `#0b4a28`, emas `#ffc80c`, latar `#f6f7f1`, huruf Nunito). Baca `docs/TEMA-SISTER.md` sebelum membuat atau mengubah halaman.

- Halaman setelah login: bungkus dengan `AppShell` dan ambil data pengguna dengan `getViewer()` (`src/components/sister/AppShell.tsx`, `src/lib/sister/viewer.ts`).
- Pakai komponen di `src/components/sister/ui.tsx` (`PageHeader`, `Card`, `StatCard`, `Badge`, `ButtonLink`, `HeroBanner`, `EmptyState`) — jangan membuat header atau gaya warna sendiri.
- Teks antarmuka berbahasa Indonesia; uji di ponsel dan laptop.
