import { NextRequest, NextResponse } from 'next/server';

function getSupabaseOrigins(): string[] {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configured) return [];
  try {
    const httpsOrigin = new URL(configured).origin;
    const websocketOrigin = httpsOrigin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    return [httpsOrigin, websocketOrigin];
  } catch {
    return [];
  }
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const connectOrigins = getSupabaseOrigins().join(' ');

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}';
    style-src-attr 'unsafe-inline';
    connect-src 'self' ${connectOrigins};
    img-src 'self' blob: data:;
    font-src 'self' data:;
    media-src 'none';
    object-src 'none';
    child-src 'none';
    frame-src 'none';
    worker-src 'self' blob:;
    base-uri 'none';
    form-action 'self';
    frame-ancestors 'none';
    manifest-src 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
