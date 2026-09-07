'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, ChevronDown, Pencil, Trash2, LockKeyhole } from 'lucide-react';
import type { VaultItem } from '@/context/VaultContext';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { PlatformIcon } from '../PlatformIcon';

interface Props {
  item: VaultItem;
  canWrite: boolean;
  onEdit: (item: VaultItem) => void;
  onRemove: (id: string) => Promise<void>;
}

/** Secret visibility and copy feedback belong to the card, and disappear on unmount. */
export function CredentialCard({ item, canWrite, onEdit, onRemove }: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<'user' | 'password' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy(field: 'user' | 'password') {
    try {
      const success = await copyToClipboardSecure(field === 'user' ? item.payload.username : item.payload.password);
      if (!success) throw new Error('Clipboard unavailable');
      setCopied(field);
      setError(null);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    } catch { setError('No se pudo copiar. Vuelve a intentarlo.'); }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await onRemove(item.id); }
    catch (err) { setError(vaultErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <article className="credential-card" aria-label={item.payload.platform}>
    <div className="credential-card-heading">
      <PlatformIcon platformName={item.payload.platform} url={item.payload.url} size="sm" />
      <h3 title={item.payload.platform}>{item.payload.platform}</h3>
      <LockKeyhole size={14} className="credential-lock" aria-hidden="true" />
    </div>
    <div className="credential-user">
      <p title={item.payload.username}>{item.payload.username}</p>
      <button onClick={() => copy('user')} title="Copiar usuario" aria-label="Copiar usuario" className="card-icon-button">
        {copied === 'user' ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
    <div className="credential-actions">
      <button onClick={() => copy('password')} title="Copiar contraseña" className="credential-copy">
        {copied === 'password' ? <Check size={16} /> : <Copy size={16} />}
        {copied === 'password' ? 'Copiada' : 'Copiar contraseña'}
      </button>
      <button onClick={() => setVisible(!visible)} aria-pressed={visible}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="card-icon-button">
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
    {visible && <p className="credential-secret">{item.payload.password}</p>}
    <p className="sr-only" role="status">{copied ? 'Copiado al portapapeles' : ''}</p>
    <details className="credential-details" onToggle={event => {
      // Closing details also dismisses a pending destructive action.
      if (!event.currentTarget.open) setConfirmDelete(false);
    }}>
      <summary>Detalles{canWrite ? ' y opciones' : ''}<ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="credential-detail-body">
        <p className="break-all">Usuario: {item.payload.username}</p>
        {item.payload.url && <p className="break-all">Sitio: {item.payload.url}</p>}
        {item.payload.notes && <p className="whitespace-pre-wrap break-words">{item.payload.notes}</p>}
        <p>Actualizada el {new Date(item.updatedAt).toLocaleDateString()}</p>
        {canWrite && <div className="flex gap-2">
          <button title="Editar" onClick={() => onEdit(item)} className="card-detail-button"><Pencil size={14} /> Editar</button>
          <button title="Eliminar" onClick={() => setConfirmDelete(true)} className="card-detail-button text-rose-300"><Trash2 size={14} /> Eliminar</button>
        </div>}
        {confirmDelete && canWrite && <div className="delete-confirmation">
          <p>¿Eliminar esta contraseña? No podrás recuperarla.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => setConfirmDelete(false)} className="card-detail-button">Cancelar</button>
            <button disabled={busy} onClick={remove} className="card-detail-button text-rose-300">{busy ? 'Eliminando…' : 'Sí, eliminar'}</button>
          </div>
        </div>}
      </div>
    </details>
    {error && <p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
  </article>;
}
