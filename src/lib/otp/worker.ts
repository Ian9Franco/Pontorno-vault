import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptOtp } from './crypto';
import { getRawEmail, verifyAndParseEmail } from './inbound';
import { InboundRejected } from './server';
import type { OtpAlias, OtpKey, OtpContext } from './types';

export async function drainOtpQueue(client: SupabaseClient) {
  await client.rpc('cleanup_otp_deliveries').throwOnError();
  const {data:jobs} = await client.rpc('claim_otp_deliveries').throwOnError();
  const result = { processed:0, rejected:0, retrying:0 };
  for (const job of jobs || []) {
    try {
      const {data:alias} = await client.from('otp_aliases').select('*').eq('id',job.alias_id).single().throwOnError();
      const a = alias as OtpAlias;
      if (a.status==='paused' || (a.status==='setup' && Date.parse(a.setup_until)<=Date.now())) {
        await client.rpc('finish_otp_delivery',{p_job_id:job.id,p_lease_id:job.lease_id,p_key_id:a.key_id,p_kind:'otp',p_envelope:null,p_expires_at:null,p_outcome:'alias_paused'}).throwOnError();
        continue;
      }
      let outcome = 'received'; let envelope = null; let context: OtpContext | null = null;
      try {
        const raw = await getRawEmail(job.email_id);
        let parsed;
        try { parsed = await verifyAndParseEmail(raw,a); } finally { raw.fill(0); }
        const {data:key} = await client.from('otp_receiving_keys').select('*').eq('id',a.key_id).single().throwOnError();
        context = {id:job.id,vault_id:a.vault_id,credential_id:a.credential_id,key_id:a.key_id,kind:parsed.kind,expires_at:parsed.expiresAt};
        envelope = await encryptOtp(parsed.code,context,(key as OtpKey).public_key);
      } catch(error) {
        if (!(error instanceof InboundRejected)) throw error;
        outcome = error.message; result.rejected += 1;
      }
      await client.rpc('finish_otp_delivery',{p_job_id:job.id,p_lease_id:job.lease_id,p_key_id:a.key_id,p_kind:context?.kind||'otp',
        p_envelope:envelope,p_expires_at:context?.expires_at||null,p_outcome:outcome}).throwOnError();
      result.processed += 1;
    } catch {
      result.retrying += 1;
      await client.rpc('retry_otp_delivery',{p_job_id:job.id,p_lease_id:job.lease_id,p_error:'processing_unavailable'}).throwOnError();
      // Only counts/outcome codes are logged; never email ids, addresses, bodies or codes.
      console.warn('otp_delivery_retry',{attempt:job.attempts});
    }
  }
  return result;
}
