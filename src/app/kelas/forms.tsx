"use client";

import { useActionState } from "react";
import { addStudent, addStudentsBulk, createClass } from "@/app/kelas/actions";
import { Field, FormMessage, FormSubmit, inputClass, textareaClass, type ActionState } from "@/components/sister/forms";

type Option = { id: string; name: string };

export function ClassCreateForm({ defaultYear, teachers }: { defaultYear: string; teachers: Option[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createClass, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tahun ajaran">
          <input name="academic_year" required defaultValue={defaultYear} pattern="\d{4}/\d{4}" placeholder="2026/2027" className={inputClass} suppressHydrationWarning />
        </Field>
        <Field label="Tingkat">
          <select name="grade" required defaultValue="10" className={inputClass} suppressHydrationWarning>
            <option value="10">X</option>
            <option value="11">XI</option>
            <option value="12">XII</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama kelas">
          <input name="name" required maxLength={40} placeholder="X-1" className={inputClass} suppressHydrationWarning />
        </Field>
        <Field label="Program (opsional)">
          <input name="program" maxLength={60} placeholder="mis. Tahfidz" className={inputClass} suppressHydrationWarning />
        </Field>
      </div>
      <Field label="Wali kelas (opsional)" hint={teachers.length ? undefined : "Belum ada guru aktif. Wali kelas bisa diatur nanti."}>
        <select name="homeroom_membership_id" defaultValue="" className={inputClass} suppressHydrationWarning>
          <option value="">— Belum ditentukan —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
      <FormMessage state={state} />
      <FormSubmit className="w-full" pendingText="Menyimpan kelas…">Tambah kelas</FormSubmit>
    </form>
  );
}

export function AddStudentForm({ classId }: { classId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addStudent, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="class_id" value={classId} />
      <Field label="Nama lengkap">
        <input name="full_name" required maxLength={120} placeholder="Nama siswa" className={inputClass} suppressHydrationWarning />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NIS">
          <input name="nis" maxLength={30} inputMode="numeric" className={inputClass} suppressHydrationWarning />
        </Field>
        <Field label="NISN">
          <input name="nisn" maxLength={10} inputMode="numeric" pattern="\d{10}" title="10 digit angka" className={inputClass} suppressHydrationWarning />
        </Field>
      </div>
      <Field label="Jenis kelamin">
        <select name="gender" defaultValue="" className={inputClass} suppressHydrationWarning>
          <option value="">—</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </Field>
      <FormMessage state={state} />
      <FormSubmit className="w-full" pendingText="Menyimpan…">Tambah siswa</FormSubmit>
    </form>
  );
}

export function BulkStudentForm({ classId }: { classId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addStudentsBulk, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="class_id" value={classId} />
      <Field
        label="Tempel dari Excel / Google Sheets"
        hint={<>Satu siswa per baris, kolom: <b>NIS · NISN · Nama · L/P</b>. Boleh juga hanya nama. Baris judul otomatis dilewati.</>}
      >
        <textarea name="rows" required rows={7} placeholder={"1001\t0091234567\tAhmad Fauzi\tL\n1002\t0091234568\tSiti Aisyah\tP"} className={textareaClass} suppressHydrationWarning />
      </Field>
      <FormMessage state={state} />
      <FormSubmit variant="secondary" className="w-full" pendingText="Mengimpor…">Tambah semua</FormSubmit>
    </form>
  );
}
