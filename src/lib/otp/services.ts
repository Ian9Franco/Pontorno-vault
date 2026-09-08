export const OTP_SERVICES = {
  netflix: { label:'Netflix', domains:['netflix.com','account.netflix.com','mailer.netflix.com'], length: [4,6] },
  disney: { label:'Disney+', domains:['disneyplus.com','mail.disneyplus.com','disney.com','accountdisney.com'], length: [6] },
  amazon: { label:'Amazon / Prime Video', domains:['amazon.com','amazon.es','amazon.co.uk','amazon.com.ar'], length: [6] },
  steam: { label:'Steam', domains:['steampowered.com'], length: [5] },
} as const;
export type OtpService = keyof typeof OTP_SERVICES;
export function isOtpService(key: string): key is OtpService { return Object.hasOwn(OTP_SERVICES,key); }

/** Only explicit code contexts. No generic 4-digit fallback, URL extraction or HTML rendering. */
export function parseVerifiedOtp(service: OtpService, sender: string, subject: string, text: string, setup = false) {
  if (subject.length>500 || text.length>100000) return null;
  const content = subject+'\n'+text;
  if (setup) {
    if (sender!=='forwarding-noreply@google.com' || !/forward|reenv[ií]o/i.test(content) || !/confirm|verific/i.test(content)) return null;
    const codes = [...content.matchAll(/(?:confirmation code|c[oó]digo de confirmaci[oó]n)\s*[:\-]?\s*([0-9]{6,12})\b/gi)].map(match=>match[1]);
    const unique = [...new Set(codes)];
    return unique.length===1 ? { code:unique[0],kind:'setup' as const } : null;
  }
  const domain = sender.split('@')[1];
  if (!(OTP_SERVICES[service].domains as readonly string[]).includes(domain)) return null;
  if (/reset|restablec|recupera|password change|cambio de contrase|invoice|factura/i.test(subject)) return null;
  if (!/code|c[oó]digo|sign.?in|inici[oa].*sesi[oó]n|acceso|verifica|steam guard|one.time/i.test(subject)) return null;
  const pattern = /(?:c[oó]digo(?: de (?:acceso|verificaci[oó]n|seguridad|un solo uso))?|verification code|security code|sign.in code|one.time (?:password|code)|OTP|code)[^\n\rA-Z0-9]{0,8}(?:(?:is|es)\s*[:\-]?\s*)?([A-Z0-9]{4,8})\b/gi;
  const candidates = [...content.matchAll(pattern)].map(match=>match[1].toUpperCase()).filter(code=>
    (OTP_SERVICES[service].length as readonly number[]).includes(code.length) && (service==='steam' ? /[0-9]/.test(code) : /^\d+$/.test(code)));
  const unique = [...new Set(candidates)];
  return unique.length===1 ? { code:unique[0],kind:'otp' as const } : null;
}
