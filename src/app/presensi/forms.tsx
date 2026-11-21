"use client";

import { useActionState } from "react";
import { saveAttendance } from "@/app/presensi/actions";
import { Field, FormMessage, FormSubmit, inputClass, type ActionState } from "@/components/sister/forms";

type AttendanceStatus = "present" | "late" | "sick" | "permission" | "absent";
type Student = { id: string; full_name: string; nis: string | null };
type ExistingRecord = { student_id: string | null; status: AttendanceStatus };

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
  students,
  records,
}: {
  classId: string;
  attendanceDate: string;
  students: Student[];
  records: ExistingRecord[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveAttendance, null);
  const statusByStudent = new Map(records.filter((record) => record.student_id).map((record) => [record.student_id as string, record.status]));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="attendance_date" value={attendanceDate} />
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
            {students.map((student, index) => (
              <tr key={student.id} className="hover:bg-[#fafcf4]">
                <td className="px-4 py-2.5 text-slate-500">{index + 1}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-bold text-[#123a25]">{student.full_name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{student.nis ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <label className="sr-only" htmlFor={"status_" + student.id}>Kehadiran " + student.full_name</label>
                  <select
                    id={"status_" + student.id}
                    name={"status_" + student.id}
                    defaultValue={statusByStudent.get(student.id) ?? ""}
                    required
                    className={inputClass}
                  >
                    <option value="">Pilih status</option>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormMessage state={state} />
      <FormSubmit className="w-full sm:w-auto" pendingText="Menyimpan presensi…">Simpan presensi</FormSubmit>
    </form>
  );
}
