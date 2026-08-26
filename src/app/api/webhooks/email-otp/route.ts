import { NextRequest, NextResponse } from 'next/server';
import { parseEmailForOtp } from '@/lib/services/otp-parser';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support standard webhook formats (Resend, Cloudflare, SendGrid, Mailgun or direct payload)
    const sender = body.from || body.sender || body.senderEmail || '';
    const subject = body.subject || '';
    const bodyText = body.text || body.body || body.bodyText || body.snippet || '';
    const bodyHtml = body.html || body.bodyHtml || '';

    const parsed = parseEmailForOtp({
      sender,
      subject,
      bodyText,
      bodyHtml,
    });

    if (!parsed) {
      return NextResponse.json(
        { error: 'No se detectó ningún código de verificación u OTP en el contenido.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('verification_codes')
        .insert({
          service_name: parsed.serviceName,
          sender_email: parsed.senderEmail,
          subject: parsed.subject,
          code: parsed.code,
          snippet: parsed.snippet,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, parsed });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al procesar webhook' },
      { status: 500 }
    );
  }
}
