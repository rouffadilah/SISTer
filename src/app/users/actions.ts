"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reviewMembership(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!membershipId || !["approve", "reject"].includes(action)) {
    redirect("/users?review=invalid");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase.rpc("admin_review_membership", {
    p_membership_id: membershipId,
    p_action: action,
  });
  if (error) redirect("/users?review=failed");
  redirect("/users?review=success");
}
