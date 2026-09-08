import { expect, it } from 'vitest';
import { POST } from './route';

it('rejects ingestion without parsing or reflecting an email or OTP', async () => {
  const response = await POST(new Request('https://example.test/api/webhooks/email-otp',{method:'POST',body:'invalid private message'}));
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'El inbox de códigos está temporalmente deshabilitado.' });
});
