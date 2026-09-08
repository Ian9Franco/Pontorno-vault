import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { otpConfiguration, otpAdmin } from '@/lib/otp/server';
import { drainOtpQueue } from '@/lib/otp/worker';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? Buffer.from('Bearer '+process.env.CRON_SECRET) : null;
  const supplied = Buffer.from(request.headers.get('authorization')||'');
  if (!expected || expected.length!==supplied.length || !timingSafeEqual(expected,supplied)) return NextResponse.json({error:'Unauthorized'},{status:401});
  if (!otpConfiguration().enabled) return NextResponse.json({status:'unconfigured'},{status:503});
  try { return NextResponse.json(await drainOtpQueue(otpAdmin()),{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({error:'delivery_unavailable'},{status:503}); }
}
