export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#f6f7f1] text-[#1f2f27]" aria-busy="true">
      <p role="status" className="sr-only">Memuat halaman…</p>
      <header className="border-b border-[#0b4a28]/[0.08] bg-white/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <span aria-hidden="true" className="h-9 w-24 animate-pulse rounded-lg bg-[#0b4a28]/10 motion-reduce:animate-none" />
          <span aria-hidden="true" className="hidden h-8 w-52 animate-pulse rounded-lg bg-[#0b4a28]/10 md:block motion-reduce:animate-none" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div aria-hidden="true" className="h-4 w-36 animate-pulse rounded bg-[#0b4a28]/10 motion-reduce:animate-none" />
        <div aria-hidden="true" className="mt-4 h-9 w-56 animate-pulse rounded bg-[#0b4a28]/10 motion-reduce:animate-none" />
        <div aria-hidden="true" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-2xl border border-[#0b4a28]/10 bg-white motion-reduce:animate-none" />
          ))}
        </div>
      </main>
    </div>
  );
}
