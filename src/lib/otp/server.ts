import { createClient } from '@supabase/supabase-js';
import type { OtpConfig } from './types';

export function otpConfiguration(): OtpConfig {
  const domain = process.env.OTP_RECEIVING_DOMAIN?.trim().toLowerCase() || '';
  const validDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
  return { domain: validDomain ? domain : null, enabled: Boolean(process.env.OTP_ENABLED === 'true' && validDomain &&
    process.env.RESEND_API_KEY && process.env.RESEND_WEBHOOK_SECRET && process.env.OTP_RAW_EMAIL_HOSTS &&
    process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) };
}
export function otpAdmin() {
  if (!otpConfiguration().enabled) throw new Error('otp_unconfigured');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} });
}
export class InboundRejected extends Error {}
export async function boundedBody(input: Request | Response, limit: number) {
  const declared = Number(input.headers.get('content-length'));
  if (declared>limit) throw new InboundRejected('message_too_large');
  const reader = input.body?.getReader();
  if (!reader) throw new InboundRejected('empty_body');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size>limit) throw new InboundRejected('message_too_large');
      chunks.push(value);
    }
    return Buffer.concat(chunks,size);
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
