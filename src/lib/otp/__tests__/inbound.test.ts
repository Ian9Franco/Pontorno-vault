import { beforeAll,describe,expect,it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { dkimSign } from 'mailauth/lib/dkim/sign';
import { dkimVerify } from 'mailauth/lib/dkim/verify';
import { verifyAndParseEmail } from '../inbound';
import type { OtpAlias } from '../types';
describe('independent email authentication',()=>{
  let signed:Buffer, record:string;
  const alias={service_key:'netflix',status:'active'} as OtpAlias;
  beforeAll(async()=>{
    const keys=generateKeyPairSync('rsa',{modulusLength:2048});
    record='v=DKIM1; k=rsa; p='+keys.publicKey.export({format:'der',type:'spki'}).toString('base64');
    const body=['From: info@netflix.com','To: alias@example.test','Subject: Your sign-in code','Date: '+new Date().toUTCString(),'Content-Type: text/plain; charset=utf-8','','Your code: 492810',''].join('\r\n');
    const privateKey = keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const signature=await dkimSign(body,{canonicalization:'relaxed/relaxed',algorithm:'rsa-sha256',signTime:new Date(),
      signingDomain:'netflix.com', selector:'test', privateKey,
      signatureData:[{signingDomain:'netflix.com',selector:'test',privateKey}]});
    signed=Buffer.from(signature.signatures+body);
  });
  const verifier: typeof dkimVerify = raw=>dkimVerify(raw,{resolver:async()=>[[record]]});
  it('accepts a real aligned DKIM signature and rejects a forged code',async()=>{
    await expect(verifyAndParseEmail(signed,alias,verifier)).resolves.toMatchObject({code:'492810',kind:'otp'});
    await expect(verifyAndParseEmail(Buffer.from(signed.toString().replace('492810','123456')),alias,verifier)).rejects.toThrow('signature_rejected');
  });
  it('does not trust forged Authentication-Results headers',async()=>{
    const fake=Buffer.from(['From: info@netflix.com','Subject: Your code','Date: '+new Date().toUTCString(),'Authentication-Results: trusted; dkim=pass','','code: 123456'].join('\r\n'));
    await expect(verifyAndParseEmail(fake,alias,verifier)).rejects.toThrow('signature_rejected');
  });
});
