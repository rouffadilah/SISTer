"use client";

// suppressHydrationWarning: beberapa ekstensi browser (pengisi formulir, pengelola
// kata sandi, download manager) menyisipkan atribut seperti `fdprocessedid` ke
// <input>/<button> sebelum React memuat halaman. Atribut itu tidak berbahaya.

import { useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, LockIcon } from "@/components/auth/icons";

const fieldBase =
  "w-full rounded-xl border border-slate-200 bg-white text-base text-slate-800 sm:text-[15px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0f5a31] focus:ring-4 focus:ring-[#0f5a31]/10";

const iconSlot = "pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#21362b]";

type BaseFieldProps = {
  id: string;
  label: string;
  compact?: boolean;
};

type TextFieldProps = BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { icon: ReactNode };

export function TextField({ id, label, icon, compact = false, className = "", ...props }: TextFieldProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className={iconSlot}>{icon}</span>
      <input id={id} {...props} suppressHydrationWarning className={`${fieldBase} ${compact ? "h-[var(--auth-field-h-compact)]" : "h-[var(--auth-field-h)]"} pl-12 pr-4 ${className}`} />
    </div>
  );
}

type PasswordFieldProps = BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type">;

export function PasswordField({ id, label, compact = false, className = "", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className={iconSlot}><LockIcon className="h-5 w-5" /></span>
      <input id={id} type={visible ? "text" : "password"} {...props} suppressHydrationWarning className={`${fieldBase} ${compact ? "h-[var(--auth-field-h-compact)]" : "h-[var(--auth-field-h)]"} pl-12 pr-12 ${className}`} />
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-lg text-[#21362b] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5a31]/40"
      >
        {visible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}

type SelectFieldProps = BaseFieldProps & {
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  describedBy?: string;
};

export function SelectField({ id, label, icon, value, onChange, options, placeholder, required, compact = false, describedBy }: SelectFieldProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className={iconSlot}>{icon}</span>
      <select
        id={id}
        suppressHydrationWarning
        required={required}
        value={value}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldBase} ${compact ? "h-[var(--auth-field-h-compact)]" : "h-[var(--auth-field-h)]"} cursor-pointer appearance-none pl-12 pr-11 ${value ? "text-slate-800" : "text-slate-400"}`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-800">{option.label}</option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-[#21362b]" />
    </div>
  );
}

type SubmitButtonProps = {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
};

export function SubmitButton({ loading, loadingText, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      suppressHydrationWarning
      disabled={loading}
      className="flex h-[var(--auth-button-h)] w-full items-center justify-center gap-2 rounded-xl bg-[#0b4a28] px-4 text-[clamp(16px,2.4dvh,18px)] font-bold text-white shadow-lg shadow-[#0b4a28]/25 transition hover:bg-[#0e5a31] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0f5a31]/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? loadingText : <>{children}<ChevronRightIcon className="h-5 w-5" strokeWidth={2.4} /></>}
    </button>
  );
}
