"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { PasswordField, SubmitButton, TextField } from "@/components/auth/AuthFields";
import { MailIcon } from "@/components/auth/icons";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (loginError) {
      setError("Email atau kata sandi tidak sesuai, atau akun belum aktif.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title="Masuk ke SISTer — SMA Islam Cikal Harapan 1">
      <form onSubmit={handleSubmit} className="space-y-[var(--auth-stack)]">
        <TextField id="email" label="Email aktif" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" icon={<MailIcon className="h-5 w-5" />} />
        <PasswordField id="password" label="Kata sandi" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <SubmitButton loading={loading} loadingText="Memeriksa akun…">Masuk</SubmitButton>
      </form>
      <p className="mt-[var(--auth-space)] text-center text-[clamp(14px,2.1dvh,15px)] text-slate-800">
        Belum memiliki akun?{" "}
        <Link href="/register" className="ml-1 font-bold text-[#f26a0f]! hover:text-[#d85a05]!">Daftar di sini</Link>
      </p>
    </AuthShell>
  );
}
