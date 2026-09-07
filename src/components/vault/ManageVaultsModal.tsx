'use client';

import React, { useState } from 'react';
import { Plus, Trash2, FolderLock, Users, AlertTriangle } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { canManageVault, vaultErrorMessage } from '@/lib/security/vault-access';
import { VaultDialog } from './VaultDialog';

interface Props { onClose: () => void; onCreate: () => void; }

/** Creation and deletion live here; editing remains scoped to the selected vault. */
export function ManageVaultsModal({ onClose, onCreate }: Props) {
  const { vaults, credentials, removeVault, activeVaultId } = useVault();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = vaults.find(vault => vault.id === pendingId);

  async function remove() {
    // Re-check the current list: ownership or available vaults may have changed.
    if (busy || !pending || !canManageVault(pending) || vaults.length <= 1) return;
    setBusy(true);
    setError(null);
    try { await removeVault(pending.id); setPendingId(null); }
    catch (err) { setError(vaultErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <VaultDialog title="Gestionar bóvedas" description="Crea un espacio nuevo o elimina una bóveda que ya no necesitas."
    busy={busy} onClose={onClose}>
    {error && <p role="alert" className="technical-error">{error}</p>}
    {pending ? <div className="vault-delete-panel">
      <AlertTriangle size={26} aria-hidden="true" />
      <h3>¿Eliminar “{pending.name}”?</h3>
      <p>Se borrarán permanentemente esta bóveda y sus {credentials.filter(item => item.vaultId === pending.id).length} contraseñas. No podrás recuperarlas.</p>
      <div className="technical-actions"><button disabled={busy} onClick={() => { setPendingId(null); setError(null); }} className="technical-secondary">Volver</button>
        <button disabled={busy || vaults.length <= 1 || !canManageVault(pending)} onClick={remove} className="technical-danger">{busy ? 'Eliminando…' : 'Sí, eliminar bóveda'}</button></div>
    </div> : <>
      <button onClick={onCreate} className="technical-primary manage-create"><Plus size={18} /> Crear nueva bóveda</button>
      <ul className="managed-vaults">{vaults.map(vault => <li key={vault.id}>
        {vault.type === 'SHARED' ? <Users size={20} aria-hidden="true" /> : <FolderLock size={20} aria-hidden="true" />}
        <div><strong>{vault.name}</strong><p>{vault.id === activeVaultId ? 'Abierta ahora · ' : ''}{canManageVault(vault) ? 'Propietario' : 'Acceso compartido'}</p></div>
        {canManageVault(vault) && <button disabled={vaults.length <= 1} onClick={() => { setPendingId(vault.id); setError(null); }}
          aria-label={`Eliminar ${vault.name}`} title={vaults.length <= 1 ? 'Debes conservar al menos una bóveda' : `Eliminar ${vault.name}`} className="card-icon-button text-rose-300"><Trash2 size={18} /></button>}
      </li>)}</ul>
      {vaults.length <= 1 && <p className="technical-hint">Debes conservar al menos una bóveda. Puedes crear otra antes de eliminar esta.</p>}
      <div className="technical-actions"><button onClick={onClose} className="technical-secondary">Listo</button></div>
    </>}
  </VaultDialog>;
}
