'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ApproveMembershipButton({ membershipId }: { membershipId: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function approve() {
    setBusy(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.rpc('sister_approve_membership', { p_membership_id: membershipId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    window.location.reload();
  }
  return <div><button className="sister-small-button" onClick={approve} disabled={busy}>{busy ? 'Menyetujui…' : 'Setujui'}</button>{error && <p className="sister-message sister-error">{error}</p>}</div>;
}
