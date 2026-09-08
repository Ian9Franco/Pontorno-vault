import { beforeAll,describe,expect,it } from 'vitest';
import { createReceivingKey,encryptOtp,decryptOtp } from '../crypto';
import { createVaultKey } from '../../crypto';
import type { OtpContext,OtpKey } from '../types';
describe('encrypted OTP envelopes',()=>{
  let key:CryptoKey, receiving:OtpKey;
  beforeAll(async()=>{key=await createVaultKey();receiving=await createReceivingKey('vault-A',key);});
  it('round trips without storing the OTP or private key in plaintext',async()=>{
    const context:OtpContext={id:'code-A',vault_id:'vault-A',credential_id:'cred-A',key_id:receiving.id,kind:'otp',expires_at:new Date(Date.now()+60000).toISOString()};
    const envelope=await encryptOtp('492810',context,receiving.public_key);
    expect(JSON.stringify(envelope)).not.toContain('492810');expect(receiving.public_key.d).toBeUndefined();
    await expect(decryptOtp(envelope,context,receiving,key)).resolves.toBe('492810');
    for(const changed of [{...context,vault_id:'vault-B'},{...context,credential_id:'cred-B'},{...context,kind:'setup' as const},{...context,expires_at:new Date(Date.now()+120000).toISOString()}]) {
      await expect(decryptOtp(envelope,changed,receiving,key)).rejects.toThrow();
    }
    await expect(decryptOtp(envelope,{...context,expires_at:new Date(0).toISOString()},receiving,key)).rejects.toThrow();
    await expect(decryptOtp(envelope,context,receiving,await createVaultKey())).rejects.toThrow();
  });
});
