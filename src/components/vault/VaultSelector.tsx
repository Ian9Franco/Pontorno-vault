import React from 'react';
import { FolderLock, Users, ArrowUpRight } from 'lucide-react';
import type { VaultEntity, VaultItem } from '@/context/VaultContext';

interface Props {
  vaults: VaultEntity[];
  credentials: VaultItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}

/** Direct vault selection. Existing extra vaults remain reachable, never silently hidden. */
export function VaultSelector({ vaults, credentials, activeId, onSelect }: Props) {
  return <nav aria-label="Seleccionar bóveda" className="vault-selector">
    {vaults.map(vault => {
      const Icon = vault.type === 'SHARED' ? Users : FolderLock;
      const count = credentials.filter(item => item.vaultId === vault.id).length;
      return <button key={vault.id} aria-pressed={vault.id === activeId}
        onClick={() => onSelect(vault.id)} className="vault-switch">
        <span className="vault-switch-top"><Icon size={20} aria-hidden="true" />
          <span>{vault.type === 'SHARED' ? 'Compartida' : 'Personal'}</span>
          <ArrowUpRight size={16} className="ml-auto" aria-hidden="true" /></span>
        <strong>{vault.name}</strong>
        <span className="vault-switch-bottom"><span>{count} {count === 1 ? 'servicio' : 'servicios'}</span>
          <span className="selection-dot" aria-hidden="true" /></span>
      </button>;
    })}
  </nav>;
}
