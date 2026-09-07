'use client';

import React, { useEffect, useState } from 'react';
import { useVault, VaultEntity } from '@/context/VaultContext';
import { CredentialPayload } from '@/lib/crypto';
import { canManageVault, canWriteCredentials, vaultErrorMessage } from '@/lib/security/vault-access';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { PlatformIcon } from './PlatformIcon';
import { CreateVaultModal } from './CreateVaultModal';
import { EditVaultModal } from './EditVaultModal';
import { OtpInboxWidget } from './OtpInboxWidget';
import { Search, Plus, Copy, Check, Eye, EyeOff, KeyRound, Settings, ChevronDown, Pencil, Trash2 } from 'lucide-react';

interface VaultViewProps {
  onAddCredential: () => void;
  onEditCredential: (item: { id: string; payload: CredentialPayload }) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({ onAddCredential, onEditCredential }) => {
  const { vaults, activeVaultId, setActiveVaultId, credentials, removeCredential, isSupabaseConnected } = useVault();
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<VaultEntity | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = vaults.find(v => v.id === activeVaultId) || vaults[0];
  const canWrite = canWriteCredentials(active);
  const all = credentials.filter(item => item.vaultId === active?.id);
  const filtered = all.filter(item => [item.payload.platform, item.payload.username, item.payload.url, item.payload.notes]
    .some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));

  useEffect(() => { setVisible({}); setPendingDelete(null); setError(null); setQuery(''); setCopied(null); }, [activeVaultId]);

  const copy = async (text: string, id: string) => {
    try {
      await copyToClipboardSecure(text);
      setCopied(id);
      setTimeout(() => setCopied(current => current === id ? null : current), 2000);
    } catch { setError('No se pudo copiar. Vuelve a intentarlo.'); }
  };
  const remove = async (id: string) => {
    if (deleting) return;
    setDeleting(true); setError(null);
    try { await removeCredential(id); setPendingDelete(null); }
    catch (err) { setError(vaultErrorMessage(err)); }
    finally { setDeleting(false); }
  };

  return <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
    <div className="mb-6 flex items-start justify-between gap-3">
      <div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tus contraseñas</h2>
        <p className="mt-1 text-sm text-slate-400">Encuentra, copia y sigue con tu día.</p></div>
    </div>
    <div className="mb-5 flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor="vault-picker" className="mb-2 block text-sm text-slate-400">Bóveda</label>
        <select id="vault-picker" value={active?.id || ''} onChange={e => setActiveVaultId(e.target.value)} className="vault-input">
          {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <button onClick={() => setCreateOpen(true)} aria-label="Crear bóveda" title="Crear bóveda" className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-slate-700 text-indigo-300 hover:bg-slate-800"><Plus className="h-5 w-5" /></button>
    </div>
    <div className="mb-5 flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400">{active?.isOwner ? 'Tu bóveda' : canWrite ? 'Puedes editar' : 'Solo lectura'} · {all.length} {all.length === 1 ? 'contraseña' : 'contraseñas'}</span>
      {canManageVault(active) && <button title="Editar o eliminar esta bóveda" onClick={() => setEditingVault(active)} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-slate-400 hover:text-white"><Settings className="h-4 w-4" /><span>Administrar</span></button>}
    </div>
    {!canWrite && <p role="status" className="mb-5 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Puedes ver y copiar. No tienes permiso para añadir, editar o eliminar contraseñas.</p>}
    <div className="mb-6 space-y-3 sm:flex sm:gap-3 sm:space-y-0">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-500" aria-hidden="true" />
        <input aria-label="Buscar contraseñas" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar servicio o usuario" className="vault-input pl-12" />
      </div>
      {canWrite && <button onClick={onAddCredential} className="vault-primary w-full sm:w-auto" aria-label="Añadir Credencial"><Plus className="h-5 w-5" /> Añadir contraseña</button>}
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-800/50 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    <p className="sr-only" role="status">{copied ? 'Copiado al portapapeles' : ''}</p>
    <div className="space-y-3">
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-10 text-center">
        <KeyRound className="mx-auto mb-4 h-8 w-8 text-indigo-400" aria-hidden="true" />
        <h3 className="text-lg font-medium">{query ? 'No encontramos coincidencias' : 'Aquí van tus contraseñas'}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{query ? 'Prueba otro servicio o nombre de usuario.' : canWrite ? 'Empieza guardando una cuenta que uses a menudo.' : 'Cuando haya una contraseña disponible, la verás aquí.'}</p>
        {query && <button onClick={() => setQuery('')} className="mt-3 min-h-11 px-4 text-sm text-indigo-300">Limpiar búsqueda</button>}
      </div>}
      {filtered.map(item => <article key={item.id} className="rounded-2xl border border-slate-800 bg-[#111624] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <PlatformIcon platformName={item.payload.platform} url={item.payload.url} size="md" />
          <div className="min-w-0 flex-1"><h3 className="truncate text-base font-semibold">{item.payload.platform}</h3><p className="truncate text-sm text-slate-400">{item.payload.username}</p></div>
          <button onClick={() => copy(item.payload.username, `${item.id}-user`)} title="Copiar usuario" aria-label="Copiar usuario" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800">{copied === `${item.id}-user` ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}</button>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => copy(item.payload.password, item.id)} title="Copiar contraseña" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500/15 px-3 text-sm font-medium text-indigo-200 hover:bg-indigo-500/25">{copied === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === item.id ? 'Copiada' : 'Copiar contraseña'}</button>
          <button onClick={() => setVisible(prev => ({ ...prev, [item.id]: !prev[item.id] }))} aria-label={visible[item.id] ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={!!visible[item.id]} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 text-slate-300">{visible[item.id] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
        </div>
        {visible[item.id] && <p className="mt-3 break-all rounded-xl bg-slate-950 p-3 font-mono text-base">{item.payload.password}</p>}
        <details className="mt-3 border-t border-slate-800 pt-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm text-slate-400">Detalles{canWrite ? ' y opciones' : ''}<ChevronDown className="h-4 w-4" /></summary>
          {item.payload.url && <p className="break-all py-2 text-sm text-slate-300">Sitio: {item.payload.url}</p>}
          {item.payload.notes && <p className="whitespace-pre-wrap break-words py-2 text-sm text-slate-300">{item.payload.notes}</p>}
          <p className="py-2 text-xs text-slate-500">Actualizada el {new Date(item.updatedAt).toLocaleDateString()}</p>
          {canWrite && <div className="flex gap-2">
            <button title="Editar" onClick={() => onEditCredential({ id: item.id, payload: item.payload })} className="vault-menu-item"><Pencil className="h-4 w-4" /> Editar</button>
            <button title="Eliminar" onClick={() => { setPendingDelete(item.id); setError(null); }} className="vault-menu-item text-rose-300"><Trash2 className="h-4 w-4" /> Eliminar</button>
          </div>}
          {pendingDelete === item.id && canWrite && <div className="mt-3 rounded-xl border border-rose-900 p-3">
            <p className="text-sm text-rose-200">¿Eliminar esta contraseña? No podrás recuperarla.</p>
            <div className="mt-3 flex gap-2"><button disabled={deleting} onClick={() => setPendingDelete(null)} className="min-h-12 flex-1 rounded-xl bg-slate-800 text-sm">Cancelar</button><button disabled={deleting} onClick={() => remove(item.id)} className="min-h-12 flex-1 rounded-xl bg-rose-700 text-sm">{deleting ? 'Eliminando…' : 'Sí, eliminar'}</button></div>
            {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
          </div>}
        </details>
      </article>)}
    </div>
    {active?.type === 'SHARED' && <details className="mt-6 rounded-2xl border border-slate-800 p-4 text-sm text-slate-400">
      <summary className="min-h-11 cursor-pointer pt-2">Sobre el acceso compartido</summary>
      <p className="py-3 leading-relaxed">Solo los miembros autorizados pueden acceder. Crear esta bóveda no añade miembros; las invitaciones aún no están disponibles.</p>
      <p className="mb-3">{isSupabaseConnected ? 'Los códigos de acceso por correo están pausados.' : 'Los códigos de esta demo son simulados.'}</p><OtpInboxWidget />
    </details>}
    <CreateVaultModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    <EditVaultModal isOpen={!!editingVault} onClose={() => setEditingVault(null)} vault={editingVault} />
  </div>;
};
