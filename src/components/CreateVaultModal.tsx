'use client';
import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { VaultDialog } from './vault/VaultDialog';
import { VaultFormFields } from './vault/VaultFormFields';

interface Props { isOpen: boolean; onClose: () => void; }
/** The inner form mounts fresh on every opening, including errors and pending state. */
export function CreateVaultModal({ isOpen, onClose }: Props) {
  return isOpen ? <CreateVaultForm onClose={onClose} /> : null;
}
function CreateVaultForm({ onClose }: { onClose: () => void }) {
  const { createVault } = useVault();
  const [name, setName] = useState('');
  const [type, setType] = useState<'PERSONAL' | 'SHARED'>('PERSONAL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true); setError(null);
    try { await createVault(name.trim(), type); onClose(); }
    catch (err) { setError(vaultErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <VaultDialog title="Crear nueva bóveda" description="Organiza tus contraseñas familiares o privadas." busy={busy} onClose={onClose}>
    {error && <p role="alert" className="technical-error">{error}</p>}
    <form onSubmit={submit}>
      <VaultFormFields name={name} type={type} onName={setName} onType={setType} disabled={busy} creating />
      <div className="technical-actions">
        <button type="button" disabled={busy} onClick={onClose} className="technical-secondary">Cancelar</button>
        <button disabled={busy || !name.trim()} className="technical-primary">{busy ? 'Creando…' : 'Crear bóveda'}</button>
      </div>
    </form>
  </VaultDialog>;
}
