import { supabase } from '@/lib/supabase/client';
import { isTestMasterSession, isTestMasterUser } from '@/lib/constants/test-master';
import { createReceivingKey, decryptOtp } from '@/lib/otp/crypto';
import { isOtpService } from '@/lib/otp/services';
import type { OtpAlias, OtpCode, OtpConfig, OtpKey, OtpSnapshot } from '@/lib/otp/types';
import type { VaultSession } from './useVaultSession';

export function createOtpActions(session: VaultSession) {
  function access(vaultId: string, owner = false) {
    if (isTestMasterSession() || isTestMasterUser(session.user)) throw new Error('El sandbox no recibe códigos reales.');
    const key = session.vaultKeysRef.current.get(vaultId);
    if (!supabase || !session.isUnlocked || !key || (owner && !session.vaults.find(v=>v.id===vaultId)?.isOwner)) throw new Error('No tienes acceso a los códigos de esta bóveda.');
    return {client:supabase,key,ticket:session.guard.capture()};
  }
  async function loadOtpInbox(vaultId: string): Promise<OtpSnapshot> {
    const {client,key,ticket} = access(vaultId);
    const [aliases,keys,codes] = await Promise.all([
      client.from('otp_aliases').select('*').eq('vault_id',vaultId).order('created_at',{ascending:false}).limit(100).throwOnError(),
      client.from('otp_receiving_keys').select('*').eq('vault_id',vaultId).limit(200).throwOnError(),
      client.from('otp_codes').select('*').eq('vault_id',vaultId).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(24).throwOnError(),
    ]);
    session.guard.assert(ticket);
    const items: OtpSnapshot['codes'] = [];
    for (const code of (codes.data || []) as OtpCode[]) {
      if (Date.parse(code.expires_at)<=Date.now()) continue;
      const receivingKey = (keys.data as OtpKey[]).find(k=>k.id===code.key_id);
      if (!receivingKey) throw new Error('No se encontró la clave de recepción. Actualiza la bandeja.');
      const plaintext = await decryptOtp(code.envelope,code,receivingKey,key);
      session.guard.assert(ticket);
      if (Date.parse(code.expires_at)>Date.now()) items.push({...code,code:plaintext});
    }
    session.guard.assert(ticket);
    return {aliases:(aliases.data||[]) as OtpAlias[],codes:items};
  }
  async function configureOtp(credentialId: string, serviceKey: string) {
    const item = session.credentials.find(c=>c.id===credentialId);
    if (!item || !isOtpService(serviceKey)) throw new Error('Selecciona una cuenta y un servicio compatible.');
    const {client,key,ticket} = access(item.vaultId,true);
    const response = await fetch('/api/otp/status',{cache:'no-store'});
    const config: OtpConfig = await response.json();
    if (!response.ok || !config.enabled) throw new Error('Falta conectar el proveedor de correo. La recepción todavía no está activa.');
    const record = await createReceivingKey(item.vaultId,key);
    session.guard.assert(ticket);
    const {data} = await client.rpc('configure_otp_alias',{p_vault_id:item.vaultId,p_credential_id:item.id,p_service_key:serviceKey,
      p_key_id:record.id,p_public_key:record.public_key,p_encrypted_private_key:record.encrypted_private_key,p_nonce:record.nonce}).throwOnError();
    session.guard.assert(ticket);
    return data as OtpAlias;
  }
  async function setOtpAliasStatus(vaultId: string, aliasId: string, status: 'active'|'paused') {
    const {client,ticket} = access(vaultId,true);
    await client.rpc('set_otp_alias_status',{p_alias_id:aliasId,p_status:status}).throwOnError(); session.guard.assert(ticket);
  }
  async function dismissOtp(vaultId: string,id: string) {
    const {client,ticket} = access(vaultId);
    await client.from('otp_codes').delete().eq('vault_id',vaultId).eq('id',id).throwOnError(); session.guard.assert(ticket);
  }
  async function listOtpMembers(vaultId: string): Promise<Array<{user_id:string;can_read:boolean}>> {
    const {client,ticket} = access(vaultId,true);
    const {data} = await client.rpc('otp_members',{p_vault_id:vaultId}).throwOnError(); session.guard.assert(ticket);
    return data||[];
  }
  async function setOtpAccess(vaultId: string,userId: string,allow: boolean) {
    const {client,ticket} = access(vaultId,true);
    await client.rpc('set_otp_access',{p_vault_id:vaultId,p_user_id:userId,p_allow:allow}).throwOnError(); session.guard.assert(ticket);
  }
  return {loadOtpInbox,configureOtp,setOtpAliasStatus,dismissOtp,listOtpMembers,setOtpAccess};
}
