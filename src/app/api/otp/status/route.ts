import { NextResponse } from 'next/server';
import { otpConfiguration } from '@/lib/otp/server';
export function GET() { return NextResponse.json(otpConfiguration(),{headers:{'Cache-Control':'no-store'}}); }
