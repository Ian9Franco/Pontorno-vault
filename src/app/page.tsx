'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { UnlockModal } from '@/components/UnlockModal';
import { VaultView } from '@/components/VaultView';
import { CredentialModal } from '@/components/CredentialModal';
import { PasswordGeneratorModal } from '@/components/PasswordGeneratorModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CredentialPayload } from '@/lib/crypto';

export default function Home() {
  const {
    user,
    isConfigured,
    isUnlocked,
    isLoading,
    isSupabaseConnected,
    saveCredential,
  } = useVault();

  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; payload: CredentialPayload } | null>(null);

  const handleOpenAddCredential = () => {
    setEditingItem(null);
    setIsCredentialModalOpen(true);
  };

  const handleOpenEditCredential = (item: { id: string; payload: CredentialPayload }) => {
    setEditingItem(item);
    setIsCredentialModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-medium tracking-wide">Cargando estado criptográfico...</span>
        </div>
      </div>
    );
  }

  // 1. If Supabase is connected but user is not logged in
  const needsAuth = isSupabaseConnected && !user;

  return (
    <main className="min-h-screen bg-[#090d16] flex flex-col">
      <Navbar
        onOpenGenerator={() => setIsGeneratorModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* State 0: Supabase Authentication */}
      {needsAuth && <AuthModal />}

      {/* State 1: New User / First Time Master Password Setup */}
      {!needsAuth && !isConfigured && <OnboardingModal />}

      {/* State 2: Existing User / Vault Locked */}
      {!needsAuth && isConfigured && !isUnlocked && <UnlockModal />}

      {/* State 3: Vault Unlocked */}
      {!needsAuth && isConfigured && isUnlocked && (
        <VaultView
          onAddCredential={handleOpenAddCredential}
          onEditCredential={handleOpenEditCredential}
        />
      )}

      {/* Modals */}
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
    </main>
  );
}
