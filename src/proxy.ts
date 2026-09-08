import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const development = process.env.NODE_ENV !== 'production';
  let apiOrigin = '';
  try { apiOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').origin; } catch { /* local mode */ }
  const csp = ["default-src 'self'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'",
    "form-action 'self'", "img-src 'self' data: blob:", "font-src 'self'", "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'nonce-"+nonce+"' 'strict-dynamic' 'wasm-unsafe-eval'"+(development ? " 'unsafe-eval'" : ''),
    "connect-src 'self' "+apiOrigin+' '+apiOrigin.replace(/^https:/,'wss:')+(development ? ' ws://localhost:* ws://127.0.0.1:*' : ''),
    ...(development ? [] : ['upgrade-insecure-requests'])].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce',nonce); headers.set('Content-Security-Policy',csp);
  const response = NextResponse.next({request:{headers}});
  response.headers.set('Content-Security-Policy',csp);
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|woff2)$).*)'] };
