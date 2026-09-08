import { dkimVerify } from 'mailauth/lib/dkim/verify';
import { simpleParser } from 'mailparser';
import { Resolver } from 'node:dns/promises';
import { InboundRejected, boundedBody } from './server';
import { OTP_SERVICES, isOtpService, parseVerifiedOtp } from './services';
import type { OtpAlias } from './types';

export async function getRawEmail(emailId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(emailId)) throw new InboundRejected('invalid_email_id');
  const response = await fetch('https://api.resend.com/emails/receiving/'+emailId, {
    headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY}, cache:'no-store', redirect:'error', signal:AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('provider_unavailable');
  const mail = JSON.parse((await boundedBody(response,512000)).toString('utf8'));
  if (mail.id!==emailId || !mail.raw?.download_url || (Array.isArray(mail.attachments) && mail.attachments.length)) throw new InboundRejected('unsupported_message');
  const created = Date.parse(mail.created_at);
  if (!Number.isFinite(created) || Date.now()-created>15*60000 || created>Date.now()+120000) throw new InboundRejected('email_expired');
  const url = new URL(mail.raw.download_url);
  const allowed = (process.env.OTP_RAW_EMAIL_HOSTS || '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  // Exact configured provider storage hosts, never a URL extracted from the message.
  if (url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443') || !allowed.includes(url.hostname)) throw new InboundRejected('raw_host_not_allowed');
  const rawResponse = await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if (!rawResponse.ok) throw new Error('provider_unavailable');
  return boundedBody(rawResponse,256000);
}

export async function verifyAndParseEmail(raw: Buffer, alias: OtpAlias, verifier = dkimVerify) {
  if (!isOtpService(alias.service_key)) throw new InboundRejected('unsupported_service');
  const headers = raw.subarray(0,raw.indexOf('\r\n\r\n')>=0 ? raw.indexOf('\r\n\r\n') : raw.length).toString('utf8');
  if (headers.length>32000 || (headers.match(/^dkim-signature:/gim)||[]).length>5 ||
    (headers.match(/^from:/gim)||[]).length!==1 || (headers.match(/^subject:/gim)||[]).length!==1 || (headers.match(/^date:/gim)||[]).length!==1) throw new InboundRejected('invalid_headers');
  const resolver = new Resolver({timeout:2000,tries:1});
  let verified;
  try { verified = await verifier(raw,{resolver: (domain: string, type: string) => {
    if (type!=='TXT' || domain.length>253 || !/^[a-z0-9_.-]+$/i.test(domain)) throw new Error('invalid_dns_query');
    return resolver.resolveTxt(domain);
  }}); } finally { resolver.cancel(); }
  const mail = await simpleParser(raw,{skipHtmlToText:false,skipTextToHtml:true,skipImageLinks:true});
  const senders = mail.from?.value || [];
  if (senders.length!==1 || !senders[0].address || mail.attachments.length) throw new InboundRejected('unsupported_message');
  const sender = senders[0].address.toLowerCase();
  const domain = sender.split('@')[1];
  const setup = alias.status==='setup';
  const allowed: readonly string[] = setup ? ['google.com'] : OTP_SERVICES[alias.service_key].domains;
  if (!allowed.includes(domain)) throw new InboundRejected('sender_rejected');
  const strongSignature = verified.results.some(signature => {
    // mailauth exposes extra verified metadata not yet included in its type declarations.
    const result = signature as typeof signature & {algo?:string;signingHeaders?:{keys?:string|string[]};canonBodyLengthLimited?:boolean;signatureTimeValid?:boolean;modulusLength?:number};
    const signed = Array.isArray(result.signingHeaders?.keys) ? result.signingHeaders.keys.join(':') : result.signingHeaders?.keys || '';
    const names = signed.toLowerCase().split(/\s*:\s*/);
    return result.status.result==='pass' && result.signingDomain===domain && result.algo==='rsa-sha256' &&
      (result.modulusLength || 0)>=2048 && !result.canonBodyLengthLimited && result.signatureTimeValid!==false &&
      ['from','subject','date'].every(name=>names.includes(name));
  });
  if (!strongSignature) {
    if (verified.results.some(signature=>signature.status.result==='temperror')) throw new Error('dns_unavailable');
    throw new InboundRejected('signature_rejected');
  }
  const date = mail.date?.getTime();
  if (!date || Date.now()-date>15*60000 || date>Date.now()+120000) throw new InboundRejected('email_expired');
  const parsed = parseVerifiedOtp(alias.service_key,sender,mail.subject||'',mail.text||'',setup);
  if (!parsed) throw new InboundRejected('code_not_found');
  return { ...parsed, expiresAt: new Date(Math.min(Date.now()+5*60000,date+15*60000)).toISOString() };
}
