import React from 'react';
import { FolderLock, Users, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { VaultEntity, VaultItem } from '@/context/VaultContext';

interface Props {
  vaults: VaultEntity[];
  credentials: VaultItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}

/** Direct vault selection. Existing extra vaults remain reachable, never silently hidden. */
export function VaultSelector({ vaults, credentials, activeId, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  return <nav aria-label="Seleccionar bóveda" className="vault-selector">
    {vaults.map(vault => {
      const Icon = vault.type === 'SHARED' ? Users : FolderLock;
      const count = credentials.filter(item => item.vaultId === vault.id).length;
      return <motion.button key={vault.id} aria-pressed={vault.id === activeId}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { y: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        onClick={() => onSelect(vault.id)} className="vault-switch">
        <span className="vault-switch-top"><Icon size={20} aria-hidden="true" />
          <span>{vault.type === 'SHARED' ? 'Compartida' : 'Personal'}</span>
          <ArrowUpRight size={16} className="ml-auto" aria-hidden="true" /></span>
        <strong>{vault.name}</strong>
        <span className="vault-switch-bottom"><span>{count} {count === 1 ? 'servicio' : 'servicios'}</span>
          <span className="selection-dot" aria-hidden="true" /></span>
      </motion.button>;
    })}
  </nav>;
}
