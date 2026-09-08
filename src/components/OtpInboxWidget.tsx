'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { supabase } from '@/lib/supabase/client';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { OTP_SERVICES, type OtpService } from '@/lib/otp/services';
import type { OtpConfig, OtpSnapshot } from '@/lib/otp/types';
import { Inbox, Copy, Check, RefreshCw, Mail, Pause, Play, ShieldCheck, Trash2 } from 'lucide-react';
import { VaultDialog } from './vault/VaultDialog';

const EMPTY: OtpSnapshot = { aliases:[], codes:[] };
const outcomes: Record<string,string> = {
  received:'Código recibido',code_not_found:'No pudimos identificar un código',
  signature_rejected:'El correo no superó la verificación de firma',sender_rejected:'Remitente no permitido',
  email_expired:'El correo llegó fuera del plazo',unsupported_message:'Formato o adjuntos no admitidos',
  access_revoked:'Es necesario renovar el alias y su clave',raw_host_not_allowed:'El proveedor requiere completar su configuración',
};

export function OtpInboxWidget({ vaultId, requestedCredential, onConfigured }: {
  vaultId: string; requestedCredential?: string | null; onConfigured?: () => void;
}) {
  const vault = useVault();
  const latest = useRef(vault); latest.current = vault;
  const owner = vault.vaults.find(v=>v.id===vaultId)?.isOwner;
  const items = vault.credentials.filter(c=>c.vaultId===vaultId);
  const [snapshot,setSnapshot] = useState<OtpSnapshot>(EMPTY);
  const [config,setConfig] = useState<OtpConfig>({enabled:false,domain:null});
  const [error,setError] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);
  const [checking,setChecking] = useState(true);
  const [open,setOpen] = useState(false);
  const [credentialId,setCredentialId] = useState('');
  const [service,setService] = useState<OtpService>('netflix');
  const [copied,setCopied] = useState<string|null>(null);
  const [consent,setConsent] = useState(false);
  const [now,setNow] = useState(Date.now());
  const [members,setMembers] = useState<Array<{user_id:string;can_read:boolean}>>([]);
  const mounted = useRef(true);
  const loading = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async()=>{});

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!requestedCredential) return;
    setCredentialId(requestedCredential); setOpen(true); setConsent(false);
    const name = items.find(c=>c.id===requestedCredential)?.payload.platform.toLowerCase() || '';
    setService(name.includes('disney') ? 'disney' : name.includes('amazon') || name.includes('prime') ? 'amazon' : name.includes('steam') ? 'steam' : 'netflix');
  }, [requestedCredential]); // The parent remounts the inbox on vault changes.

  useEffect(() => {
    let stopped = false;
    const abort = new AbortController();
    const refresh = async () => {
      if (stopped || loading.current || document.hidden) return;
      if (!latest.current.isSupabaseConnected) { setChecking(false); return; }
      loading.current = true;
      try {
        const response = await fetch('/api/otp/status',{cache:'no-store',signal:abort.signal});
        if (!response.ok) throw new Error('No se pudo consultar el estado de recepción.');
        const status: OtpConfig = await response.json();
        // Reading existing encrypted codes remains possible when ingestion is paused.
        const next = await latest.current.loadOtpInbox(vaultId);
        if (!stopped) { setConfig(status); setSnapshot(next); setError(null); }
      } catch (err) {
        if (!stopped) { setSnapshot(EMPTY); setError(vaultErrorMessage(err,'No se pudo actualizar la bandeja de códigos.')); }
      } finally { loading.current = false; if (!stopped) setChecking(false); }
    };
    refreshRef.current = refresh;
    void refresh();
    const interval = setInterval(()=>void refresh(),8000);
    const tick = setInterval(()=>setNow(Date.now()),1000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange',visible);
    window.addEventListener('online',visible);
    // Only alias metadata is published, never the code ciphertext or plaintext.
    const channel = latest.current.isSupabaseConnected ? supabase?.channel('otp-notices-'+vaultId)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'otp_aliases',filter:'vault_id=eq.'+vaultId},()=>void refresh()).subscribe() : undefined;
    return () => {
      stopped=true; abort.abort(); clearInterval(interval); clearInterval(tick);
      document.removeEventListener('visibilitychange',visible); window.removeEventListener('online',visible);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [vaultId]);

  async function action(operation: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await operation(); if (mounted.current) await refreshRef.current(); }
    catch(err) { if (mounted.current) setError(vaultErrorMessage(err)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function copy(value: string,id: string,expiresAt?: string) {
    if (expiresAt && Date.parse(expiresAt)<=Date.now()) { setError('Ese código ya venció. Solicita uno nuevo.'); return; }
    if (await copyToClipboardSecure(value)) {
      if (mounted.current) setCopied(id);
    } else if (mounted.current) setError('No se pudo copiar. Vuelve a intentarlo.');
  }
  function close() { setOpen(false); onConfigured?.(); }
  function beginSetup() { setCredentialId(items[0]?.id||''); setConsent(false); setOpen(true); }

  if (!vault.isSupabaseConnected) return <section className="otp-panel" aria-label="Códigos de acceso">
    <div className="otp-title"><Inbox size={20}/><h3>Códigos de acceso</h3></div>
    <p>La recepción por correo necesita una cuenta sincronizada. La demo local no recibe mensajes reales.</p>
  </section>;

  return <section className="otp-panel" aria-label="Códigos de acceso">
    <header className="otp-header">
      <div><div className="otp-title"><Inbox size={20}/><h3>Códigos de acceso</h3></div>
        <p>Solo para esta bóveda. Se descifran en tu dispositivo.</p></div>
      <div className="otp-actions">
        <button className="technical-secondary" disabled={checking||busy} onClick={()=>void refreshRef.current()} aria-label="Actualizar códigos"><RefreshCw size={16}/></button>
        {owner && <button className="technical-primary" onClick={beginSetup} disabled={!items.length||checking}><Mail size={16}/>Recibir códigos</button>}
      </div>
    </header>
    {checking && <p role="status">Comprobando la recepción…</p>}
    {!checking && !config.enabled && <p className="otp-notice">Recepción sin conectar. Falta configurar el proveedor de correo en el servidor. Tus contraseñas siguen disponibles.</p>}
    {error && <p className="technical-error" role="alert">{error}</p>}
    {!checking && !snapshot.codes.length && <p className="otp-empty">{snapshot.aliases.some(a=>a.status==='active') ? 'Esperando el próximo correo de acceso. No hace falta mantener esta página abierta.' : 'Activa la recepción en una cuenta para ver sus códigos aquí.'}</p>}
    <div className="otp-code-grid">
      {snapshot.codes.map(item=>{
        const credential = items.find(c=>c.id===item.credential_id);
        const expired = Date.parse(item.expires_at)<=now;
        const remaining = Math.max(0,Math.ceil((Date.parse(item.expires_at)-now)/1000));
        return <article key={item.id} className="otp-code" data-expired={expired}>
          <div className="otp-code-heading"><strong>{item.kind==='setup' ? 'Confirmar reenvío de Gmail' : credential?.payload.platform||'Servicio'}</strong>
            <span>{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>
          {credential && <p>{credential.payload.username.slice(0,2)}•••</p>}
          <div className="otp-code-value"><span>{expired ? 'Vencido' : item.code}</span>
            <button disabled={expired||busy} onClick={()=>void copy(item.code,item.id,item.expires_at)} className="card-icon-button" aria-label="Copiar código">{copied===item.id ? <Check size={18}/> : <Copy size={18}/>}</button>
            <button disabled={busy} onClick={()=>void action(()=>vault.dismissOtp(vaultId,item.id))} className="card-icon-button" aria-label="Descartar código"><Trash2 size={16}/></button></div>
          <p>{expired ? 'Solicita un código nuevo al servicio.' : 'Se ocultará en '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0')+' · El servicio puede vencerlo antes.'}</p>
        </article>;
      })}
    </div>
    {snapshot.codes.length>1 && <p className="technical-hint">Un nuevo intento puede invalidar el código anterior. Recibir un código no confirma quién inició sesión.</p>}
    {!!snapshot.aliases.length && <details className="otp-connections"><summary>Conexiones de correo ({snapshot.aliases.length})</summary>
      {snapshot.aliases.map(alias=><div key={alias.id} className="otp-connection">
        <div><strong>{items.find(c=>c.id===alias.credential_id)?.payload.platform||'Cuenta'}</strong>
          <p>{alias.status==='active' ? 'Recepción activa' : alias.status==='paused' ? 'Pausada' : 'Configuración de reenvío'}{alias.last_received_at ? ' · Último correo '+new Date(alias.last_received_at).toLocaleString() : ''}</p>
          {alias.last_status && <p>{outcomes[alias.last_status]||'Correo revisado'}</p>}
          {owner && config.domain && <button className="otp-address" onClick={()=>void copy('r-'+alias.address_token+'@'+config.domain,alias.id)} title="Copiar dirección de recepción">{'r-'+alias.address_token+'@'+config.domain} {copied===alias.id ? '✓' : '⧉'}</button>}
        </div>
        {owner && <div className="otp-actions">
          <button disabled={busy || (alias.status!=='active' && alias.last_status==='access_revoked')} className="technical-secondary"
            onClick={()=>void action(()=>vault.setOtpAliasStatus(vaultId,alias.id,alias.status==='active'?'paused':'active'))}>
            {alias.status==='active' ? <Pause size={14}/> : <Play size={14}/>}
            {alias.status==='active' ? 'Pausar' : alias.status==='setup' ? 'Ya configuré el filtro' : 'Activar'}</button>
          <button className="technical-secondary" disabled={busy} onClick={()=>{setCredentialId(alias.credential_id);setService(alias.service_key as OtpService);setConsent(false);setOpen(true);}}>Renovar alias</button>
        </div>}
      </div>)}
    </details>}
    {owner && <details className="otp-permissions" onToggle={event=>{
      if (event.currentTarget.open) void action(async()=>{const list=await vault.listOtpMembers(vaultId);if(mounted.current)setMembers(list);});
    }}><summary><ShieldCheck size={15}/>Quién puede ver los códigos</summary>
      <p className="technical-hint">Solo tú por defecto. Compartir contraseña y código concentra ambos factores; protege el acceso al vault con MFA independiente.</p>
      {members.map(member=><div className="otp-member" key={member.user_id}><span>{member.user_id===vault.user?.id ? 'Tú · Propietario' : 'Miembro '+member.user_id.slice(0,8)}</span>
        <button disabled={busy||member.user_id===vault.user?.id} className="technical-secondary" onClick={()=>void action(async()=>{
          await vault.setOtpAccess(vaultId,member.user_id,!member.can_read);
          const list=await vault.listOtpMembers(vaultId);if(mounted.current)setMembers(list);
        })}>{member.can_read ? 'Retirar acceso' : 'Permitir códigos'}</button></div>)}
      <p className="technical-hint">Retirar acceso pausa todos los alias. Renueva sus claves antes de volver a recibir códigos.</p>
    </details>}
    {open && owner && <VaultDialog title="Recibir códigos por correo" onClose={close} busy={busy}
      description="Cada cuenta recibe un alias privado. El proveedor ve el correo; el vault conserva solo el código cifrado.">
      <form onSubmit={event=>{event.preventDefault(); if(!consent||!config.enabled)return; void action(async()=>{
        await vault.configureOtp(credentialId,service); if(mounted.current)close();
      });}} className="technical-fields">
        <div><label htmlFor="otp-credential">Cuenta</label><select id="otp-credential" className="technical-input" value={credentialId} onChange={e=>setCredentialId(e.target.value)} required>{items.map(c=><option key={c.id} value={c.id}>{c.payload.platform} · {c.payload.username}</option>)}</select></div>
        <div><label htmlFor="otp-service">Formato del servicio</label><select id="otp-service" className="technical-input" value={service} onChange={e=>setService(e.target.value as OtpService)}>{Object.entries(OTP_SERVICES).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></div>
        <ol className="otp-steps"><li>Crea el alias y cópialo desde «Conexiones de correo».</li><li>En Gmail, añade esa dirección como reenvío. El código de confirmación aparecerá aquí durante los próximos 30 minutos.</li><li>Confirma la dirección en Gmail y crea un filtro por remitente y asunto de acceso del servicio. No actives el reenvío de todo el buzón.</li><li>Vuelve aquí, pulsa «Ya configuré el filtro» y solicita un código de prueba en el servicio.</li></ol>
        <p className="technical-hint">Si Gmail no envía un código reconocible, renueva el alias y revisa la configuración. Solo se admiten correos numéricos de acceso (y Steam Guard); no SMS, push ni enlaces de acceso.</p>
        <label className="otp-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>Entiendo el reenvío selectivo. Renovar un alias invalida su dirección anterior y exige actualizar el filtro.</label>
        {!config.enabled && <p role="status" className="otp-notice">Esta instalación aún necesita conectar Resend, su dominio y las claves del servidor.</p>}
        <div className="technical-actions"><button type="button" className="technical-secondary" onClick={close} disabled={busy}>Cerrar</button><button className="technical-primary" type="submit" disabled={busy||!consent||!config.enabled||!credentialId}>{busy ? 'Creando recepción segura…' : 'Crear alias seguro'}</button></div>
      </form>
    </VaultDialog>}
  </section>;
}
