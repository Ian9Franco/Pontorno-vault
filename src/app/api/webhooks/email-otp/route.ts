import { NextResponse } from 'next/server';

// Fail closed before reading untrusted bodies until signed, tenant-scoped ingestion exists.
export async function POST() {
  return NextResponse.json(
    { error: 'El inbox de códigos está temporalmente deshabilitado.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
