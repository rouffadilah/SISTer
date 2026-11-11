"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewMembership } from "@/app/users/actions";

type Props = { membershipId: string };

export default function ApproveMembershipButton({ membershipId }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(action: "approve" | "reject") {
    setError("");
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    formData.set("action", action);

    startTransition(async () => {
      try {
        await reviewMembership(formData);
        router.refresh();
      } catch {
        setError("Permintaan belum berhasil diproses. Muat ulang halaman dan coba kembali.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => submit("approve")}
        disabled={busy}
        className="rounded-lg bg-[#0b4a28] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0e5a31] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Memproses…" : "Setujui"}
      </button>
      <button
        type="button"
        onClick={() => submit("reject")}
        disabled={busy}
        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Tolak
      </button>
      {error && <p role="alert" className="w-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
