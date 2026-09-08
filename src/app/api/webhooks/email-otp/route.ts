import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { boundedBody, InboundRejected, otpAdmin, otpConfiguration } from '@/lib/otp/server';
import { drainOtpQueue } from '@/lib/otp/worker';

export const runtime = 'nodejs';
export const maxDuration = 60;
const reply = (status: number, message: string) => NextResponse.json(status>=400?{error:message}:{status:message},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request: Request) {
  const config = otpConfiguration();
  if (!config.enabled) return reply(503,'El inbox de códigos está temporalmente deshabilitado.');
  let payload: {type?:string;data?:{email_id?:string;to?:string[]}};
  const id = request.headers.get('svix-id') || '';
  try {
    const raw = await boundedBody(request,32000);
    try { new Webhook(process.env.RESEND_WEBHOOK_SECRET!).verify(raw.toString('utf8'),{
      'svix-id':id,'svix-timestamp':request.headers.get('svix-timestamp')||'',
      'svix-signature':request.headers.get('svix-signature')||'',
    }); payload = JSON.parse(raw.toString('utf8')); } finally { raw.fill(0); }
  } catch(error) { return reply(error instanceof InboundRejected ? 413 : 400,'invalid_webhook'); }
  if (!payload || typeof payload!=='object') return reply(400,'invalid_event');
  if (payload.type!=='email.received') return reply(200,'ignored');
  if (!payload.data || typeof payload.data.email_id!=='string' || !/^[0-9a-f-]{36}$/i.test(payload.data.email_id) ||
    !Array.isArray(payload.data.to) || payload.data.to.length>20 || id.length>200) return reply(400,'invalid_event');
  try {
    const client = otpAdmin();
    for (const recipient of new Set(payload.data.to)) {
      if (typeof recipient!=='string') continue;
      const [local,domain] = recipient.toLowerCase().split('@');
      if (domain!==config.domain || !/^r-[0-9a-f]{40}$/.test(local)) continue;
      await client.rpc('enqueue_otp_delivery',{p_event_id:id,p_email_id:payload.data.email_id,p_address_token:local.slice(2)}).throwOnError();
    }
    await drainOtpQueue(client);
    const {count} = await client.from('otp_delivery_jobs').select('id',{count:'exact',head:true}).eq('email_id',payload.data.email_id).in('status',['pending','processing']).throwOnError();
    // Non-2xx requests make the provider retry even after a serverless process stops.
    return count ? reply(503,'delivery_pending') : reply(202,'accepted');
  } catch { return reply(503,'delivery_unavailable'); }
}
