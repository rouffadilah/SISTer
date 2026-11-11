"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reviewMembership(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const action = String(formData.get("action") ?? "");

  // UUID validasi dasar mencegah input malformed mencapai RPC.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(membershipId) || !["approve", "reject"].includes(action)) {
    redirect("/users?review=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/");

  const { error } = await supabase.rpc("admin_review_membership", {
    p_membership_id: membershipId,
    p_action: action,
  });

  if (error) {
    // Jangan menampilkan detail internal database/RLS ke browser.
    redirect("/users?review=failed");
  }

  redirect("/users?review=success");
}
