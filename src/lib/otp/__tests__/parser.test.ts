import { describe,it,expect } from 'vitest';
import { parseVerifiedOtp } from '../services';
describe('strict inbound code parser',()=>{
  it.each([
    ['netflix','info@netflix.com','Tu código de acceso','Tu código de acceso es 492810.','492810'],
    ['disney','account@disneyplus.com','Your verification code','Your verification code is: 829104','829104'],
    ['amazon','account@amazon.com','Sign-in code','Your code: 348910','348910'],
    ['steam','noreply@steampowered.com','Steam Guard code','Your code: X8TQ2','X8TQ2'],
  ] as const)('extracts explicit %s codes',(service,sender,subject,body,code)=>{
    expect(parseVerifiedOtp(service,sender,subject,body)).toMatchObject({code,kind:'otp'});
  });
  it('rejects recovery, spoofed domains, ambiguous codes and unrelated numbers',()=>{
    expect(parseVerifiedOtp('netflix','info@netflix.com.evil.test','Your code','code: 123456')).toBeNull();
    expect(parseVerifiedOtp('netflix','info@netflix.com','Reset your password','code: 123456')).toBeNull();
    expect(parseVerifiedOtp('netflix','info@netflix.com','Your code','code: 123456\ncode: 654321')).toBeNull();
    expect(parseVerifiedOtp('netflix','info@netflix.com','Your code','Invoice 123456')).toBeNull();
    expect(parseVerifiedOtp('netflix','info@netflix.com','Your code','https://evil.test/verify')).toBeNull();
  });
  it('accepts forwarding confirmation only in the explicit setup window flow',()=>{
    const body='Gmail forwarding confirmation code: 123456789';
    expect(parseVerifiedOtp('netflix','forwarding-noreply@google.com','Gmail forwarding confirmation',body,true)).toMatchObject({kind:'setup',code:'123456789'});
    expect(parseVerifiedOtp('netflix','forwarding-noreply@google.com','Gmail forwarding confirmation',body)).toBeNull();
  });
});
