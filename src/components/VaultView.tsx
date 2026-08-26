'use client';

import React, { useState, useMemo } from 'react';
import { useVault } from '@/context/VaultContext';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { CredentialPayload } from '@/lib/crypto';
import { PlatformIcon } from './PlatformIcon';
import { OtpInboxWidget } from './OtpInboxWidget';
import { EmailForwardingGuideModal } from './EmailForwardingGuideModal';
import { CreateVaultModal } from './CreateVaultModal';
import {
  Search,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Edit2,
  FolderLock,
  Users,
  Key,
  Lock,
  User,
  Shield,
  Sparkles,
} from 'lucide-react';

interface VaultViewProps {
  onAddCredential: () => void;
  onEditCredential: (item: { id: string; payload: CredentialPayload }) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  onAddCredential,
  onEditCredential,
}) => {
  const {
    userProfile,
    vaults,
    activeVaultId,
    setActiveVaultId,
    credentials,
    removeCredential,
  } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];

  const sharedVaults = useMemo(() => vaults.filter((v) => v.type === 'SHARED'), [vaults]);
  const personalVaults = useMemo(() => vaults.filter((v) => v.type === 'PERSONAL'), [vaults]);

  // Filter credentials belonging to active vault and matching search query
  const filteredCredentials = useMemo(() => {
    return credentials.filter((item) => {
      const matchesVault = activeVault ? item.vaultId === activeVault.id : true;
      if (!matchesVault) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const p = item.payload;
      return (
        p.platform.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        (p.url && p.url.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (item.createdBy?.name && item.createdBy.name.toLowerCase().includes(q))
      );
    });
  }, [credentials, activeVault, searchQuery]);

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboardSecure(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* OTP Verification Codes Live Feed (Only on Family / Shared Vaults) */}
        {activeVault?.type === 'SHARED' && (
          <OtpInboxWidget onOpenGuide={() => setIsGuideOpen(true)} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar / Categorized Vaults */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Tus Bóvedas</h2>
                <button
                  onClick={() => setIsCreateVaultOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition"
                  title="Crear Nueva Bóveda"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear</span>
                </button>
              </div>

              {/* 1. Shared / Family Vaults Section */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" />
                  <span>Bóvedas Familiares</span>
                </div>

                {sharedVaults.length === 0 ? (
                  <p className="text-[11px] text-gray-500 px-2 italic">Sin bóvedas familiares</p>
                ) : (
                  sharedVaults.map((vault) => {
                    const isActive = activeVault?.id === vault.id;
                    const count = credentials.filter((c) => c.vaultId === vault.id).length;

                    return (
                      <button
                        key={vault.id}
                        onClick={() => setActiveVaultId(vault.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? 'bg-cyan-950/50 border border-cyan-500/50 text-cyan-200 shadow-sm'
                            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Users className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="truncate">{vault.name}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-950/80 text-gray-400 font-mono">
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* 2. Personal / Private Vaults Section */}
              <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  <FolderLock className="w-3.5 h-3.5" />
                  <span>Bóvedas Privadas (Solo Tú)</span>
                </div>

                {personalVaults.length === 0 ? (
                  <p className="text-[11px] text-gray-500 px-2 italic">Sin bóvedas privadas</p>
                ) : (
                  personalVaults.map((vault) => {
                    const isActive = activeVault?.id === vault.id;
                    const count = credentials.filter((c) => c.vaultId === vault.id).length;

                    return (
                      <button
                        key={vault.id}
                        onClick={() => setActiveVaultId(vault.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 shadow-sm'
                            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FolderLock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{vault.name}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-950/80 text-gray-400 font-mono">
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* User Session Info Card */}
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 text-xs text-gray-400 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <User className="w-4 h-4" /> Miembro Activo
              </div>
              <div className="p-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-xs">
                <span className="text-gray-200 font-semibold block">{userProfile?.displayName || 'Usuario'}</span>
                <span className="text-gray-500 text-[11px] block truncate">{userProfile?.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Bóveda descifrada en memoria RAM</span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3 space-y-4">
            {/* Active Vault Banner */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    activeVault?.type === 'SHARED'
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {activeVault?.type === 'SHARED' ? <Users className="w-5 h-5" /> : <FolderLock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{activeVault?.name || 'Bóveda'}</span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                        activeVault?.type === 'SHARED'
                          ? 'bg-cyan-950/80 border border-cyan-800/60 text-cyan-300'
                          : 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-300'
                      }`}
                    >
                      {activeVault?.type === 'SHARED' ? '👨‍👩‍👧‍👦 Familiar / Compartida' : '🔒 Privada (Solo Tú)'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeVault?.type === 'SHARED'
                      ? 'Todas las credenciales aquí son visibles para los miembros de tu familia.'
                      : 'Esta bóveda es 100% privada. Ningún otro familiar tiene la clave para verla.'}
                  </p>
                </div>
              </div>

              <button
                onClick={onAddCredential}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Credencial</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={`Buscar en ${activeVault?.name || 'la bóveda'} por plataforma, usuario o autor...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Credentials List */}
            {filteredCredentials.length === 0 ? (
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-800/80 text-gray-400 flex items-center justify-center mb-3">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {searchQuery ? 'No se encontraron resultados' : 'Bóveda vacía'}
                </h3>
                <p className="text-xs text-gray-400 mb-5 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Intenta con otro término de búsqueda.'
                    : `Añade tu primera credencial a ${activeVault?.name || 'la bóveda'}.`}
                </p>
                {!searchQuery && (
                  <button
                    onClick={onAddCredential}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Ahora</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredCredentials.map((item) => {
                  const isPasswordVisible = Boolean(visiblePasswords[item.id]);
                  const isUserCopied = copiedId === `${item.id}-user`;
                  const isPassCopied = copiedId === `${item.id}-pass`;

                  const creatorName = item.createdBy?.name || 'Miembro Familiar';
                  const isMe = Boolean(item.createdBy?.isCurrentUser);
                  const creatorInitial = creatorName.replace('(Tú)', '').trim().substring(0, 2).toUpperCase() || 'U';

                  return (
                    <div
                      key={item.id}
                      className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition shadow-sm space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Crisp Brand Logo */}
                          <PlatformIcon
                            platformName={item.payload.platform}
                            url={item.payload.url}
                            size="md"
                            className="group-hover:scale-105"
                          />

                          <div className="min-w-0">
                            <h4 className="text-base font-semibold text-white flex items-center gap-2 truncate">
                              <span className="truncate">{item.payload.platform}</span>
                              {item.payload.url && (
                                <a
                                  href={item.payload.url.startsWith('http') ? item.payload.url : `https://${item.payload.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-500 hover:text-emerald-400 transition flex-shrink-0"
                                  title="Abrir sitio web"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </h4>

                            {/* Creator & Timestamp Badge */}
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-800/60 text-emerald-300 text-[9px] font-bold flex items-center justify-center">
                                  {creatorInitial}
                                </span>
                                <span className={isMe ? 'text-emerald-300 font-medium' : 'text-gray-300'}>
                                  {creatorName}
                                </span>
                              </span>
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-500 text-[11px]">
                                {new Date(item.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onEditCredential({ id: item.id, payload: item.payload })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeCredential(item.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Data Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {/* Username */}
                        <div className="flex items-center justify-between p-2.5 bg-gray-950 border border-gray-800/80 rounded-xl">
                          <span className="text-gray-300 font-mono truncate mr-2">
                            {item.payload.username}
                          </span>
                          <button
                            onClick={() => handleCopy(item.payload.username, `${item.id}-user`)}
                            className="p-1 rounded text-gray-400 hover:text-white transition flex-shrink-0"
                            title="Copiar usuario"
                          >
                            {isUserCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between p-2.5 bg-gray-950 border border-gray-800/80 rounded-xl">
                          <span className="text-gray-300 font-mono truncate mr-2">
                            {isPasswordVisible ? item.payload.password : '••••••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => togglePasswordVisibility(item.id)}
                              className="p-1 rounded text-gray-400 hover:text-white transition"
                              title={isPasswordVisible ? 'Ocultar' : 'Mostrar'}
                            >
                              {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(item.payload.password, `${item.id}-pass`)}
                              className="p-1 rounded text-gray-400 hover:text-white transition"
                              title="Copiar contraseña"
                            >
                              {isPassCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Notes preview if present */}
                      {item.payload.notes && (
                        <p className="text-xs text-gray-400 bg-gray-950/60 p-2 rounded-lg border border-gray-800/60 italic">
                          {item.payload.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <EmailForwardingGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <CreateVaultModal
        isOpen={isCreateVaultOpen}
        onClose={() => setIsCreateVaultOpen(false)}
      />
    </>
  );
};
