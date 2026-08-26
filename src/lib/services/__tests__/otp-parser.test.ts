import { describe, it, expect } from 'vitest';
import { parseEmailForOtp } from '../otp-parser';

describe('OTP & Verification Code Email Parser', () => {
  it('should extract Disney+ 6-digit verification code', () => {
    const parsed = parseEmailForOtp({
      sender: 'account@disneyplus.com',
      subject: 'Tu código de un solo uso de Disney+',
      bodyText: 'Hola, tu código de acceso para iniciar sesión en Disney+ es: 492810. Válido por 15 minutos.',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.serviceName).toBe('Disney+');
    expect(parsed?.code).toBe('492810');
  });

  it('should extract Netflix verification code', () => {
    const parsed = parseEmailForOtp({
      sender: 'info@account.netflix.com',
      subject: 'Código de inicio de sesión de Netflix',
      bodyText: 'Introduce este código para confirmar tu dispositivo: 839201.',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.serviceName).toBe('Netflix');
    expect(parsed?.code).toBe('839201');
  });

  it('should extract Netflix Travel / Update Location Magic Link when present', () => {
    const parsed = parseEmailForOtp({
      sender: 'info@account.netflix.com',
      subject: 'Cómo actualizar tu Hogar con Netflix',
      bodyText: 'Haz clic aquí para confirmar: https://www.netflix.com/travel-verification?token=xyz123',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.serviceName).toBe('Netflix');
    expect(parsed?.code).toBe('https://www.netflix.com/travel-verification?token=xyz123');
  });

  it('should extract Steam Guard and Amazon codes', () => {
    const steamParsed = parseEmailForOtp({
      sender: 'noreply@steampowered.com',
      subject: 'Código de Steam Guard',
      bodyText: 'Aquí está tu código de Steam Guard: 59381',
    });
    expect(steamParsed?.serviceName).toBe('Steam');
    expect(steamParsed?.code).toBe('59381');
  });
});
