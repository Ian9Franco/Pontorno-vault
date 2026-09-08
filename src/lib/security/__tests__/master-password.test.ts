import { describe,expect,it } from 'vitest';
import { assertNewMasterPassword } from '../master-password';
import { createSessionGuard } from '../session-guard';
import { deriveKEKBytes,generateSalt,setupUserCrypto,rotateMasterPassword,unlockUserMasterKey,createVaultKey,encryptCredential,decryptCredential,wrapVaultKeyForUser,unwrapVaultKey } from '../../crypto';
const params = {timeCost:1,memoryCost:4096,parallelism:1,hashLength:32};
describe('master secret and session hardening',()=>{
  it.each(['short','Password123!','123456789012','aaaaaaaaaaaa'])('rejects weak new passwords: %s',password=>{
    expect(()=>assertNewMasterPassword(password)).toThrow();
  });
  it('accepts long Unicode phrases without trimming or changing the secret',()=>{
    expect(()=>assertNewMasterPassword('ñandú cobre océano nube')).not.toThrow();
  });
  it('invalidates work captured before lock and accepts only new tickets',async()=>{
    const guard=createSessionGuard(); let publish=false; let resolve!:()=>void;
    const pending=new Promise<void>(r=>{resolve=r;}); const ticket=guard.capture();
    const operation=(async()=>{await pending;guard.assert(ticket);publish=true;})();
    guard.invalidate();resolve();await expect(operation).rejects.toThrow('sesión cambió');expect(publish).toBe(false);
    expect(()=>guard.assert(guard.capture())).not.toThrow();
  });
  it('rejects malformed or expensive KDF parameters before allocating Argon2 memory',async()=>{
    for(const invalid of [{...params,memoryCost:1000000000},{...params,timeCost:NaN},{...params,parallelism:0},{...params,hashLength:16},null]) {
      await expect(deriveKEKBytes('secret',generateSalt(),invalid as typeof params)).rejects.toThrow('configuración criptográfica');
    }
    await expect(deriveKEKBytes('secret',new Uint8Array(4),params)).rejects.toThrow();
  });
  it('binds user keys and vault wrappers to their authenticated identities',async()=>{
    const {setup,userMasterKey}=await setupUserCrypto('lago cristal viento cobre',params,'user-A');
    await expect(unlockUserMasterKey('lago cristal viento cobre',setup,false,'user-B')).rejects.toThrow();
    const wrapped=await wrapVaultKeyForUser(await createVaultKey(),userMasterKey,{vaultId:'v-A',userId:'user-A'});
    await expect(unwrapVaultKey(wrapped.ciphertext,wrapped.nonce,userMasterKey,{vaultId:'v-B',userId:'user-A',cryptoVersion:2})).rejects.toThrow();
  });
  it('binds v3 credentials to both vault and credential IDs, keeping v2 readable',async()=>{
    const key=await createVaultKey(), payload={platform:'Example',username:'user',password:'secret'};
    const data=await encryptCredential(payload,key,{vaultId:'v-A',credentialId:'c-A'});
    expect(data.cryptoVersion).toBe(3);
    await expect(decryptCredential(data,key,{vaultId:'v-A',credentialId:'c-B'})).rejects.toThrow();
    await expect(decryptCredential(data,key,{vaultId:'v-B',credentialId:'c-A'})).rejects.toThrow();
    await expect(decryptCredential(data,key,{vaultId:'v-A',credentialId:'c-A'})).resolves.toEqual(payload);
    await expect(decryptCredential(await encryptCredential(payload,key),key)).resolves.toEqual(payload);
  });
  it('rotates legacy user wrapping into v2 without losing the existing data key',async()=>{
    const {setup,userMasterKey}=await setupUserCrypto('lago cristal viento cobre',params);
    const payload={platform:'Example',username:'user',password:'secret'};
    const encrypted=await encryptCredential(payload,userMasterKey);
    const rotated=await rotateMasterPassword('lago cristal viento cobre','piedra bosque papel luna',setup,params,'user-A');
    expect(rotated.updatedSetup.cryptoVersion).toBe(2);
    const key=await unlockUserMasterKey('piedra bosque papel luna',rotated.updatedSetup,false,'user-A');
    await expect(decryptCredential(encrypted,key)).resolves.toEqual(payload);
    await expect(unlockUserMasterKey('lago cristal viento cobre',rotated.updatedSetup,false,'user-A')).rejects.toThrow();
  });
});
