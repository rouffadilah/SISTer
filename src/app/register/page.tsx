"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { PasswordField, SelectField, SubmitButton, TextField } from "@/components/auth/AuthFields";
import { MailIcon, UserIcon, UsersIcon } from "@/components/auth/icons";
import { createClient } from "@/lib/supabase/client";

const userTypes = [
  { value: "teacher", label: "Guru" },
  { value: "student", label: "Siswa" },
  { value: "staff", label: "Staf sekolah" },
  { value: "principal", label: "Kepala sekolah" },
  { value: "vice_principal", label: "Wakil kepala sekolah" },
  { value: "homeroom_teacher", label: "Wali kelas" },
  { value: "counselor", label: "Guru BK" },
  { value: "parent", label: "Orang tua/wali" },
  { value: "finance", label: "Keuangan" },
  { value: "it_admin", label: "Admin IT" },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!requestedRole) return setError("Pilih jenis pengguna terlebih dahulu.");
    if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (password !== confirmPassword) return setError("Konfirmasi kata sandi tidak sama.");
    if (!process.env.NEXT_PUBLIC_SCHOOL_SLUG) return setError("Konfigurasi sekolah belum lengkap. Hubungi administrator.");

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), requested_role: requestedRole, school_slug: process.env.NEXT_PUBLIC_SCHOOL_SLUG } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message.includes("already registered") ? "Email ini sudah terdaftar. Silakan masuk." : "Pendaftaran belum berhasil. Periksa email dan coba kembali.");
      return;
    }
    setSuccess("Pendaftaran berhasil dikirim. Jika verifikasi email diaktifkan, buka email Anda terlebih dahulu. Keanggotaan akan berstatus menunggu persetujuan administrator.");
    setFullName(""); setEmail(""); setRequestedRole(""); setPassword(""); setConfirmPassword("");
  }

  return (
    <AuthShell title="Daftar akun SISTer — SMA Islam Cikal Harapan 1" compact>
      <form onSubmit={handleSubmit} className="space-y-[var(--auth-stack-compact)]">
        <TextField id="fullName" label="Nama lengkap" compact required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" icon={<UserIcon className="h-5 w-5" />} />
        <TextField id="email" label="Email aktif" compact type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" icon={<MailIcon className="h-5 w-5" />} />
        <div>
          <SelectField id="requestedRole" label="Jenis pengguna" compact required value={requestedRole} onChange={setRequestedRole} options={userTypes} placeholder="Pilih jenis pengguna" describedBy="requestedRoleHint" icon={<UsersIcon className="h-5 w-5" />} />
          <p id="requestedRoleHint" className="mt-1 px-1 text-[11.5px] leading-snug text-slate-500 sm:text-xs">Jenis pengguna merupakan permintaan dan harus disetujui administrator.</p>
        </div>
        <PasswordField id="password" label="Kata sandi" compact required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi (minimal 8 karakter)" />
        <PasswordField id="confirmPassword" label="Ulangi kata sandi" compact required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi kata sandi" />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-3 text-sm leading-relaxed text-emerald-800">{success}</p>}
        <div className="pt-[clamp(2px,0.6dvh,6px)]">
          <SubmitButton loading={loading} loadingText="Mengirim pendaftaran…">Daftar</SubmitButton>
        </div>
      </form>
      <p className="mt-[var(--auth-space)] text-center text-[clamp(14px,2.1dvh,15px)] text-slate-800">
        Sudah memiliki akun?{" "}
        <Link href="/" className="ml-1 font-bold text-[#f26a0f]! hover:text-[#d85a05]!">Masuk di sini</Link>
      </p>
    </AuthShell>
  );
}
