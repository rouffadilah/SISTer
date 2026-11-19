"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/sister/ui";

/*
 * Elemen formulir bertema SISTer untuk halaman di dalam aplikasi.
 * Hasil server action dikembalikan sebagai ActionState lalu ditampilkan dengan <FormMessage>.
 */

export type ActionState = { ok?: string; error?: string } | null;

export const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0f5a31] focus:ring-4 focus:ring-[#0f5a31]/10 sm:text-sm";

export const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-mono text-sm text-slate-800 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-[#0f5a31] focus:ring-4 focus:ring-[#0f5a31]/10";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold text-[#123a25]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

export function FormSubmit({ children, pendingText = "Menyimpan…", variant = "primary", className = "" }: { children: ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "gold" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} suppressHydrationWarning className={buttonClasses(variant, className)}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.ok) return null;
  return state.error ? (
    <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-700">{state.error}</p>
  ) : (
    <p role="status" className="rounded-xl bg-[#e3f1e0] px-3.5 py-2.5 text-sm leading-6 text-[#0b4a28]">{state.ok}</p>
  );
}

/** Tombol kirim dengan konfirmasi (untuk aksi hapus). */
export function ConfirmButton({ message, children, className = "" }: { message: string; children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      suppressHydrationWarning
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={className}
    >
      {pending ? "Memproses…" : children}
    </button>
  );
}
