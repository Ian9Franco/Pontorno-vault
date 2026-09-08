import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { Webhook } from 'svix';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),count:0,drain:vi.fn()}));
vi.mock('@/lib/otp/server',async importOriginal=>{
  const original=await importOriginal<typeof import('@/lib/otp/server')>();
  return {...original,otpAdmin:()=>({rpc:mocks.rpc,from:()=>({select:()=>({eq:()=>({in:()=>({throwOnError:async()=>({count:mocks.count})})})})})})};
});
vi.mock('@/lib/otp/worker',()=>({drainOtpQueue:mocks.drain}));
import { POST } from './route';
const secret='whsec_'+Buffer.alloc(32,7).toString('base64');
const recipient='r-'+'a'.repeat(40)+'@codes.example.test';
function request(body:string,date=new Date(),signature?:string) {
  const id='msg-test';
  return new Request('https://example.test/api/webhooks/email-otp',{method:'POST',body,headers:{
    'svix-id':id,'svix-timestamp':String(Math.floor(date.getTime()/1000)),
    'svix-signature':signature||new Webhook(secret).sign(id,date,body),
  }});
}
beforeEach(()=>{
  vi.stubEnv('OTP_ENABLED','true');vi.stubEnv('OTP_RECEIVING_DOMAIN','codes.example.test');
  for(const name of ['RESEND_API_KEY','OTP_RAW_EMAIL_HOSTS','SUPABASE_SERVICE_ROLE_KEY'])vi.stubEnv(name,'configured');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('RESEND_WEBHOOK_SECRET',secret);
  mocks.rpc.mockReset().mockReturnValue({throwOnError:async()=>({data:null})});mocks.drain.mockReset().mockResolvedValue({});mocks.count=0;
});
afterEach(()=>vi.unstubAllEnvs());
describe('signed tenant-scoped ingestion',()=>{
  const body=()=>JSON.stringify({type:'email.received',data:{email_id:'00000000-0000-4000-8000-000000000001',to:[recipient]}});
  it('enqueues a signed event using only the alias token, never a supplied vault id',async()=>{
    expect((await POST(request(body()))).status).toBe(202);
    expect(mocks.rpc).toHaveBeenCalledWith('enqueue_otp_delivery',{p_event_id:'msg-test',p_email_id:'00000000-0000-4000-8000-000000000001',p_address_token:'a'.repeat(40)});
  });
  it('rejects wrong signatures, old timestamps and oversized bodies before database access',async()=>{
    expect((await POST(request(body(),new Date(),'v1,invalid'))).status).toBe(400);
    expect((await POST(request(body(),new Date(Date.now()-3600000)))).status).toBe(400);
    expect((await POST(request('x'.repeat(32001)))).status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('asks the provider to retry when durable work remains',async()=>{
    mocks.count=1;expect((await POST(request(body()))).status).toBe(503);
  });
  it('rejects a signed malformed event and ignores foreign domains',async()=>{
    expect((await POST(request('null'))).status).toBe(400);
    expect((await POST(request(body().replace('codes.example.test','evil.test')))).status).toBe(202);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
