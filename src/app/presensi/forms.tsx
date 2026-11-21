"use client";

import { useActionState } from "react";
import { saveAttendance } from "@/app/presensi/actions";
import { FormMessage, FormSubmit, inputClass, type ActionState } from "@/components/sister/forms";

type AttendanceStatus = "present" | "late" | "sick" | "permission" | "absent";
type AttendanceEntry = {
  key: string;
  student_id: string | null;
  record_id: string | null;
  full_name: string;
  nis: string | null;
  status: AttendanceStatus | null;
  historical: boolean;
};

const statusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "sick", label: "Sakit" },
  { value: "permission", label: "Izin" },
  { value: "absent", label: "Alpa" },
];

export function AttendanceForm({
  classId,
  attendanceDate,
  revision,
  entries,
}: {
  classId: string;
  attendanceDate: string;
  revision: number;
  entries: AttendanceEntry[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveAttendance, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="attendance_date" value={attendanceDate} />
      <input type="hidden" name="attendance_revision" value={revision} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eff7d2] text-[#0b4a28]">
            <tr>
              <th scope="col" className="px-4 py-3 font-extrabold">No.</th>
              <th scope="col" className="px-4 py-3 font-extrabold">Nama siswa</th>
              <th scope="col" className="px-4 py-3 font-extrabold">NIS</th>
              <th scope="col" className="min-w-44 px-4 py-3 font-extrabold">Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0b4a28]/[0.06]">
            {entries.map((entry, index) => {
              const statusName = entry.historical
                ? "status_record_" + entry.record_id
                : "status_student_" + entry.student_id;
              const inputId = "attendance_" + entry.key;

              return (
                <tr key={entry.key} className="hover:bg-[#fafcf4]">
                  <td className="px-4 py-2.5 text-slate-500">
                    {index + 1}
                    {entry.historical && entry.record_id && (
                      <input type="hidden" name="historical_record_id" value={entry.record_id} />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-bold text-[#123a25]">
                    {entry.full_name}
                    {entry.historical && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Riwayat</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{entry.nis ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <label className="sr-only" htmlFor={inputId}>Kehadiran {entry.full_name}</label>
                    <select
                      id={inputId}
                      name={statusName}
                      defaultValue={entry.status ?? ""}
                      required
                      className={inputClass}
                    >
                      <option value="">Pilih status</option>
                      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FormMessage state={state} />
      <FormSubmit className="w-full sm:w-auto" pendingText="Menyimpan presensi…">Simpan presensi</FormSubmit>
    </form>
  );
}
