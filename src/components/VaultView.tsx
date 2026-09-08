'use client';

import React, { useState } from 'react';
import { useVault, type VaultEntity } from '@/context/VaultContext';
import type { CredentialPayload } from '@/lib/crypto';
import { canManageVault, canWriteCredentials } from '@/lib/security/vault-access';
import { Pencil, Layers } from 'lucide-react';
import { CreateVaultModal } from './CreateVaultModal';
import { EditVaultModal } from './EditVaultModal';
import { OtpInboxWidget } from './OtpInboxWidget';
import { VaultSelector } from './vault/VaultSelector';
import { SecurityStatus } from './vault/SecurityStatus';
import { CredentialLibrary } from './vault/CredentialLibrary';
import { ManageVaultsModal } from './vault/ManageVaultsModal';
import { VaultObject } from './vault/VaultObject';
import { isTestMasterUser } from '@/lib/constants/test-master';

interface VaultViewProps {
  onAddCredential: () => void;
  onEditCredential: (item: { id: string; payload: CredentialPayload }) => void;
}

/** Dashboard composition only: session permissions remain enforced by context and database. */
export function VaultView({ onAddCredential, onEditCredential }: VaultViewProps) {
  const { user, vaults, activeVaultId, setActiveVaultId, credentials, removeCredential,
    isSupabaseConnected, autoLockMinutes } = useVault();
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<VaultEntity | null>(null);
  const [otpCredential, setOtpCredential] = useState<string | null>(null);
  const active = vaults.find(vault => vault.id === activeVaultId) || vaults[0];
  const canWrite = canWriteCredentials(active);
  const items = credentials.filter(item => item.vaultId === active?.id);

  return <div className="vault-dashboard">
    {isTestMasterUser(user) && <p role="status" className="dashboard-notice">Sandbox de prueba · Cuenta pública, solo para datos ficticios. No se sincroniza con Supabase.</p>}
    <div className="dashboard-heading">
      <div>
        <p className="dashboard-eyebrow"><span aria-hidden="true" /> PONTORNO / ESPACIO PRIVADO</p>
        <h2>Tus contraseñas</h2>
        <p className="dashboard-description">Encuentra, copia y sigue con tu día.</p>
      </div>
      <VaultObject interactive />
    </div>
    <SecurityStatus local={!isSupabaseConnected} autoLockMinutes={autoLockMinutes ?? 5} />
    <VaultSelector vaults={vaults} credentials={credentials} activeId={active?.id}
      onSelect={id=>{setOtpCredential(null);setActiveVaultId(id);}} />
    <div className="vault-access-row">
      <p><span className="access-indicator" aria-hidden="true" />{active?.isOwner ? 'Tu bóveda' : canWrite ? 'Puedes editar' : 'Solo lectura'}
        <span className="access-description"> / {active?.type === 'SHARED' ? 'Miembros autorizados' : 'Acceso personal'}</span></p>
      <div className="flex items-center gap-2">
        <button onClick={() => setManageOpen(true)} className="dashboard-manage"><Layers size={15} /> Gestionar bóvedas</button>
        {canManageVault(active) && <button title="Editar bóveda actual" onClick={() => setEditingVault(active)} className="dashboard-manage"><Pencil size={15} /> Editar actual</button>}
      </div>
    </div>
    {!canWrite && <p role="status" className="dashboard-notice">Puedes ver y copiar. No tienes permiso para añadir, editar o eliminar contraseñas.</p>}
    {/* Switching vaults unmounts card secrets, search and pagination together. */}
    <CredentialLibrary key={'credentials-' + (active?.id || 'empty')} items={items} canWrite={canWrite}
      onAdd={onAddCredential} onEdit={onEditCredential} onRemove={removeCredential}
      onReceiveCode={active?.isOwner && isSupabaseConnected ? setOtpCredential : undefined} />
    {active && <OtpInboxWidget key={'otp-' + active.id} vaultId={active.id} requestedCredential={otpCredential} onConfigured={()=>setOtpCredential(null)} />}
    {active?.type === 'SHARED' && <details className="sharing-notice">
      <summary>Sobre el acceso compartido</summary>
      <p>Solo los miembros autorizados pueden acceder. Crear esta bóveda no añade miembros; las invitaciones aún no están disponibles.</p>
    </details>}
    <CreateVaultModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    {manageOpen && <ManageVaultsModal onClose={() => setManageOpen(false)} onCreate={() => { setManageOpen(false); setCreateOpen(true); }} />}
    <EditVaultModal isOpen={!!editingVault} onClose={() => setEditingVault(null)} vault={editingVault} />
  </div>;
}
