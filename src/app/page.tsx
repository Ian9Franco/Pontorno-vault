'use client';

import React, { useState, useEffect } from 'react';
import { useVault } from '@/context/VaultContext';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { UnlockModal } from '@/components/UnlockModal';
import { VaultView } from '@/components/VaultView';
import { CredentialModal } from '@/components/CredentialModal';
import { PasswordGeneratorModal } from '@/components/PasswordGeneratorModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CredentialPayload } from '@/lib/crypto';

export default function Home() {
  const {
    user,
    isUnlocked,
    isLoading,
    isSupabaseConnected,
    saveCredential,
  } = useVault();

  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; payload: CredentialPayload } | null>(null);

  useEffect(() => {
    if (!isUnlocked) {
      setIsCredentialModalOpen(false);
      setIsSettingsModalOpen(false);
      setIsGeneratorModalOpen(false);
      setEditingItem(null);
    }
  }, [isUnlocked]);

  const handleOpenAddCredential = () => {
    setEditingItem(null);
    setIsCredentialModalOpen(true);
  };

  const handleOpenEditCredential = (item: { id: string; payload: CredentialPayload }) => {
    setEditingItem(item);
    setIsCredentialModalOpen(true);
  };

  // Not logged in -> Show Unified Auth (Email, Display Name, Master Password)
  const isLoggedOut = isSupabaseConnected ? !user : !isUnlocked;

  return (
    <main className="min-h-screen bg-[#090d16] flex flex-col">
      <Navbar
        onOpenGenerator={() => setIsGeneratorModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* State 1: Unified Auth (Register / Login in 1 Step) */}
      {isLoggedOut && <AuthModal />}

      {/* State 2: Logged in to Supabase but Vault is Locked by Auto-Lock Timeout */}
      {!isLoggedOut && !isUnlocked && <UnlockModal />}

      {/* State 3: Vault Unlocked & Active */}
      {!isLoggedOut && isUnlocked && (
        <VaultView
          onAddCredential={handleOpenAddCredential}
          onEditCredential={handleOpenEditCredential}
        />
      )}

      {/* Secret-bearing modals unmount when the vault locks. */}
      {isUnlocked && <>
      <CredentialModal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        onSave={saveCredential}
        initialData={editingItem}
      />

      <PasswordGeneratorModal
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      </>}
    </main>
  );
}
