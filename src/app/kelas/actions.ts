"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/sister/forms";
import { createClient } from "@/lib/supabase/server";
import { isAcademicYear, isMissingTable } from "@/lib/sister/school";
import { getViewer } from "@/lib/sister/viewer";

/*
 * Aksi data Kelas & Siswa. Semua aksi hanya untuk Admin Sekolah.
 * Pemeriksaan di sini untuk pesan yang ramah; keamanan sebenarnya dijaga RLS
 * (lihat supabase/kelas-siswa.sql).
 */

const SETUP_HINT = "Tabel kelas/siswa belum tersedia. Jalankan supabase/kelas-siswa.sql di Supabase SQL Editor.";

async function adminContext() {
  const viewer = await getViewer();
  if (!viewer.isAdmin || !viewer.schoolId) return null;
  return { viewer, schoolId: viewer.schoolId, supabase: await createClient() };
}

function text(formData: FormData, key: string, max = 120) {
  return String(formData.get(key) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function optional(value: string) {
  return value ? value : null;
}

function normalizeGender(value: string): "L" | "P" | null {
  const v = value.trim().toLowerCase();
  if (["l", "lk", "laki", "laki-laki", "laki laki", "pria"].includes(v)) return "L";
  if (["p", "pr", "perempuan", "wanita"].includes(v)) return "P";
  return null;
}

function friendlyError(error: { code?: string; message?: string }, fallback: string) {
  if (isMissingTable(error)) return SETUP_HINT;
  if (error.code === "42501") return "Akun Anda tidak memiliki izin untuk perubahan ini.";
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Kelas                                                               */
/* ------------------------------------------------------------------ */

export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Hanya Admin Sekolah yang dapat menambah kelas." };

  const academicYear = text(formData, "academic_year", 9);
  const grade = Number(formData.get("grade"));
  const name = text(formData, "name", 40);
  const program = optional(text(formData, "program", 60));
  const homeroom = optional(text(formData, "homeroom_membership_id", 60));

  if (!isAcademicYear(academicYear)) return { error: "Tahun ajaran harus berformat 2026/2027." };
  if (![10, 11, 12].includes(grade)) return { error: "Pilih tingkat kelas." };
  if (!name) return { error: "Nama kelas wajib diisi, misalnya X-1." };

  const { error } = await ctx.supabase.from("classes").insert({
    school_id: ctx.schoolId,
    academic_year: academicYear,
    grade,
    name,
    program,
    homeroom_membership_id: homeroom,
  });
  if (error) {
    return { error: error.code === "23505" ? `Kelas ${name} untuk tahun ajaran ${academicYear} sudah ada.` : friendlyError(error, "Kelas belum dapat disimpan. Coba lagi.") };
  }

  revalidatePath("/kelas");
  return { ok: `Kelas ${name} (${academicYear}) berhasil ditambahkan.` };
}

export async function updateHomeroom(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const classId = text(formData, "class_id", 60);
  const homeroom = optional(text(formData, "homeroom_membership_id", 60));
  await ctx.supabase.from("classes").update({ homeroom_membership_id: homeroom }).eq("id", classId).eq("school_id", ctx.schoolId);
  revalidatePath(`/kelas/${classId}`);
  revalidatePath("/kelas");
}

export async function deleteClass(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const classId = text(formData, "class_id", 60);
  await ctx.supabase.from("classes").delete().eq("id", classId).eq("school_id", ctx.schoolId);
  revalidatePath("/kelas");
  revalidatePath("/siswa");
  redirect("/kelas");
}

/* ------------------------------------------------------------------ */
/* Siswa                                                               */
/* ------------------------------------------------------------------ */

export async function addStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Hanya Admin Sekolah yang dapat menambah siswa." };

  const classId = optional(text(formData, "class_id", 60));
  const fullName = text(formData, "full_name", 120);
  const nis = optional(text(formData, "nis", 30));
  const nisn = optional(text(formData, "nisn", 20));
  const gender = normalizeGender(text(formData, "gender", 12));

  if (!fullName) return { error: "Nama siswa wajib diisi." };
  if (nisn && !/^\d{10}$/.test(nisn)) return { error: "NISN harus 10 digit angka." };

  const { error } = await ctx.supabase.from("students").insert({ school_id: ctx.schoolId, class_id: classId, full_name: fullName, nis, nisn, gender });
  if (error) {
    return { error: error.code === "23505" ? "NIS atau NISN tersebut sudah dipakai siswa lain." : friendlyError(error, "Siswa belum dapat disimpan. Coba lagi.") };
  }

  if (classId) revalidatePath(`/kelas/${classId}`);
  revalidatePath("/kelas");
  revalidatePath("/siswa");
  return { ok: `${fullName} berhasil ditambahkan.` };
}

type ParsedStudent = { full_name: string; nis: string | null; nisn: string | null; gender: "L" | "P" | null };

/**
 * Membaca baris yang ditempel dari Excel/Google Sheets.
 * Urutan kolom: NIS, NISN, Nama, L/P — atau cukup Nama saja per baris.
 */
function parseStudentLines(raw: string) {
  const rows: ParsedStudent[] = [];
  const skipped: string[] = [];
  raw.split(/\r?\n/).forEach((original, index) => {
    const line = original.trim();
    if (!line) return;
    const cols = (line.includes("\t") ? line.split("\t") : line.split(/[;,]/)).map((c) => c.trim());
    if (index === 0 && cols.some((c) => /^nama/i.test(c))) return; // baris judul
    let nis = "", nisn = "", name = "", gender = "";
    if (cols.length === 1) [name] = cols;
    else if (cols.length === 2) [nis, name] = cols;
    else [nis, nisn, name, gender = ""] = cols;
    name = name.replace(/\s+/g, " ").slice(0, 120);
    if (!name || /^\d+$/.test(name)) {
      skipped.push(`baris ${index + 1}`);
      return;
    }
    rows.push({ full_name: name, nis: nis || null, nisn: nisn || null, gender: normalizeGender(gender) });
  });
  return { rows, skipped };
}

export async function addStudentsBulk(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "Hanya Admin Sekolah yang dapat menambah siswa." };

  const classId = optional(text(formData, "class_id", 60));
  const { rows, skipped } = parseStudentLines(String(formData.get("rows") ?? "").slice(0, 100_000));
  if (!rows.length) return { error: "Tidak ada baris siswa yang bisa dibaca. Tempel data dengan urutan kolom: NIS, NISN, Nama, L/P." };
  if (rows.length > 500) return { error: "Maksimal 500 siswa sekali tempel." };

  // Lewati NIS/NISN yang sudah terdaftar atau ganda di data tempelan.
  const nisList = rows.map((r) => r.nis).filter((v): v is string => Boolean(v));
  const nisnList = rows.map((r) => r.nisn).filter((v): v is string => Boolean(v));
  const taken = new Set<string>();
  if (nisList.length) {
    const { data, error } = await ctx.supabase.from("students").select("nis").eq("school_id", ctx.schoolId).in("nis", nisList);
    if (error) return { error: friendlyError(error, "Data siswa belum dapat diperiksa. Coba lagi.") };
    (data ?? []).forEach((d) => taken.add(`nis:${d.nis}`));
  }
  if (nisnList.length) {
    const { data } = await ctx.supabase.from("students").select("nisn").eq("school_id", ctx.schoolId).in("nisn", nisnList);
    (data ?? []).forEach((d) => taken.add(`nisn:${d.nisn}`));
  }
  const fresh: ParsedStudent[] = [];
  const duplicates: string[] = [];
  for (const row of rows) {
    const keys = [row.nis && `nis:${row.nis}`, row.nisn && `nisn:${row.nisn}`].filter(Boolean) as string[];
    if (keys.some((k) => taken.has(k))) {
      duplicates.push(row.full_name);
      continue;
    }
    keys.forEach((k) => taken.add(k));
    fresh.push(row);
  }

  if (fresh.length) {
    const { error } = await ctx.supabase.from("students").insert(fresh.map((row) => ({ ...row, school_id: ctx.schoolId, class_id: classId })));
    if (error) return { error: error.code === "23505" ? "Ada NIS/NISN yang sudah dipakai. Periksa data lalu coba lagi." : friendlyError(error, "Data siswa belum dapat disimpan. Coba lagi.") };
  }

  if (classId) revalidatePath(`/kelas/${classId}`);
  revalidatePath("/kelas");
  revalidatePath("/siswa");

  const notes = [
    duplicates.length ? `${duplicates.length} dilewati karena NIS/NISN sudah terdaftar (${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? ", …" : ""})` : "",
    skipped.length ? `${skipped.length} baris tidak terbaca (${skipped.slice(0, 3).join(", ")})` : "",
  ].filter(Boolean);
  if (!fresh.length) return { error: `Tidak ada siswa baru yang ditambahkan. ${notes.join("; ")}.` };
  return { ok: `${fresh.length} siswa berhasil ditambahkan.${notes.length ? ` ${notes.join("; ")}.` : ""}` };
}

export async function removeFromClass(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const studentId = text(formData, "student_id", 60);
  const classId = text(formData, "class_id", 60);
  await ctx.supabase.from("students").update({ class_id: null }).eq("id", studentId).eq("school_id", ctx.schoolId);
  revalidatePath(`/kelas/${classId}`);
  revalidatePath("/kelas");
  revalidatePath("/siswa");
}

export async function deleteStudent(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const studentId = text(formData, "student_id", 60);
  const classId = text(formData, "class_id", 60);
  await ctx.supabase.from("students").delete().eq("id", studentId).eq("school_id", ctx.schoolId);
  if (classId) revalidatePath(`/kelas/${classId}`);
  revalidatePath("/kelas");
  revalidatePath("/siswa");
}

export async function assignClass(formData: FormData) {
  const ctx = await adminContext();
  if (!ctx) return;
  const studentId = text(formData, "student_id", 60);
  const classId = optional(text(formData, "class_id", 60));
  await ctx.supabase.from("students").update({ class_id: classId }).eq("id", studentId).eq("school_id", ctx.schoolId);
  if (classId) revalidatePath(`/kelas/${classId}`);
  revalidatePath("/kelas");
  revalidatePath("/siswa");
}
