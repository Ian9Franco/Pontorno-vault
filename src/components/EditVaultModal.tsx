'use client';
import React, { useState } from 'react';
import { useVault, type VaultEntity } from '@/context/VaultContext';
import { canManageVault, vaultErrorMessage } from '@/lib/security/vault-access';
import { VaultDialog } from './vault/VaultDialog';
import { VaultFormFields } from './vault/VaultFormFields';

interface Props { isOpen: boolean; onClose: () => void; vault: VaultEntity | null; }
/** Only editing is offered here. Ownership is checked both at the UI and persistence boundary. */
export function EditVaultModal({ isOpen, onClose, vault }: Props) {
  if (!isOpen || !vault || !canManageVault(vault)) return null;
  return <EditVaultForm key={vault.id} vault={vault} onClose={onClose} />;
}
function EditVaultForm({ vault, onClose }: { vault: VaultEntity; onClose: () => void }) {
  const { updateVault } = useVault();
  const [name, setName] = useState(vault.name);
  const [type, setType] = useState(vault.type);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true); setError(null);
    try { await updateVault(vault.id, name.trim(), type); onClose(); }
    catch (err) { setError(vaultErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <VaultDialog title="Editar bóveda actual" description={vault.name} busy={busy} onClose={onClose}>
    {error && <p role="alert" className="technical-error">{error}</p>}
    <form onSubmit={submit}>
      <VaultFormFields name={name} type={type} onName={setName} onType={setType} disabled={busy} />
      {vault.type === 'SHARED' && type === 'PERSONAL' && <p role="status" className="technical-hint">Solo podrás convertirla en privada si no tiene otros miembros. Cambiar el tipo no revoca accesos.</p>}
      <div className="technical-actions">
        <button type="button" disabled={busy} onClick={onClose} className="technical-secondary">Cancelar</button>
        <button disabled={busy || !name.trim()} className="technical-primary">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  </VaultDialog>;
}
