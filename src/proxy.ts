import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Memperbarui sesi login Supabase di setiap navigasi, sehingga pengguna
 * tidak tiba-tiba keluar setelah token akses kedaluwarsa (±1 jam).
 * (Next.js 16: file `proxy.ts` menggantikan `middleware.ts`.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Jangan menaruh kode lain di antara createServerClient dan baris ini.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Lewati file statis dan gambar agar tidak memperlambat halaman.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
