'use client';

import React, { useState, useMemo } from 'react';
import { useVault, VaultEntity } from '@/context/VaultContext';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { CredentialPayload } from '@/lib/crypto';
import { PlatformIcon } from './PlatformIcon';
import { OtpInboxWidget } from './OtpInboxWidget';
import { EmailForwardingGuideModal } from './EmailForwardingGuideModal';
import { CreateVaultModal } from './CreateVaultModal';
import { EditVaultModal } from './EditVaultModal';
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
  Settings,
  ShieldCheck,
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
  const [editingVault, setEditingVault] = useState<VaultEntity | null>(null);

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
            <div className="bg-[#111624] border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tus Bóvedas</h2>
                <button
                  onClick={() => setIsCreateVaultOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 text-xs font-semibold border border-indigo-500/30 transition shadow-sm"
                  title="Crear Nueva Bóveda"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear</span>
                </button>
              </div>

              {/* 1. Shared / Family Vaults Section */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Bóvedas Familiares</span>
                </div>

                {sharedVaults.length === 0 ? (
                  <p className="text-[11px] text-slate-500 px-2 italic">Sin bóvedas familiares</p>
                ) : (
                  sharedVaults.map((vault) => {
                    const isActive = activeVault?.id === vault.id;
                    const count = credentials.filter((c) => c.vaultId === vault.id).length;

                    return (
                      <div key={vault.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => setActiveVaultId(vault.id)}
                          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                            isActive
                              ? 'bg-sky-950/40 border border-sky-500/40 text-sky-200 shadow-sm font-semibold'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Users className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                            <span className="truncate">{vault.name}</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950/80 text-slate-400 font-mono">
                            {count}
                          </span>
                        </button>
                        <button
                          onClick={() => setEditingVault(vault)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-300 hover:bg-slate-800/80 transition opacity-0 group-hover:opacity-100"
                          title="Editar Bóveda"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 2. Personal / Private Vaults Section */}
              <div className="space-y-1 pt-3 border-t border-slate-800/70">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                  <FolderLock className="w-3.5 h-3.5" />
                  <span>Bóvedas Privadas</span>
                </div>

                {personalVaults.length === 0 ? (
                  <p className="text-[11px] text-slate-500 px-2 italic">Sin bóvedas privadas</p>
                ) : (
                  personalVaults.map((vault) => {
                    const isActive = activeVault?.id === vault.id;
                    const count = credentials.filter((c) => c.vaultId === vault.id).length;

                    return (
                      <div key={vault.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => setActiveVaultId(vault.id)}
                          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                            isActive
                              ? 'bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 shadow-sm font-semibold'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FolderLock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span className="truncate">{vault.name}</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950/80 text-slate-400 font-mono">
                            {count}
                          </span>
                        </button>
                        <button
                          onClick={() => setEditingVault(vault)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-slate-800/80 transition opacity-0 group-hover:opacity-100"
                          title="Editar Bóveda"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Member Card */}
            <div className="bg-[#111624]/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <User className="w-4 h-4" /> Miembro de la Familia
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
                <span className="text-slate-200 font-semibold block">{userProfile?.displayName || 'Usuario'}</span>
                <span className="text-slate-400 text-[11px] block truncate">{userProfile?.email}</span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3 space-y-4">
            {/* Active Vault Banner */}
            <div className="bg-[#111624] border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    activeVault?.type === 'SHARED'
                      ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                      : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {activeVault?.type === 'SHARED' ? <Users className="w-5 h-5" /> : <FolderLock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>{activeVault?.name || 'Bóveda'}</span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                        activeVault?.type === 'SHARED'
                          ? 'bg-sky-950/80 border border-sky-800/60 text-sky-300'
                          : 'bg-indigo-950/80 border border-indigo-800/60 text-indigo-300'
                      }`}
                    >
                      {activeVault?.type === 'SHARED' ? (
                        <>
                          <Users className="w-3 h-3" />
                          <span>Familiar Compartida</span>
                        </>
                      ) : (
                        <>
                          <FolderLock className="w-3 h-3" />
                          <span>Privada (Solo Tú)</span>
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => setEditingVault(activeVault)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition"
                      title="Editar o eliminar esta bóveda"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeVault?.type === 'SHARED'
                      ? 'Todas las credenciales guardadas aquí pueden ser vistas por los miembros de tu familia.'
                      : 'Esta bóveda es privada y exclusiva para ti.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onAddCredential}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-950/50 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Credencial</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder={`Buscar en ${activeVault?.name || 'la bóveda'} por servicio, usuario o creador...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#111624] border border-slate-800/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
              />
            </div>

            {/* Credentials List */}
            {filteredCredentials.length === 0 ? (
              <div className="bg-[#111624]/60 border border-slate-800/80 rounded-2xl p-12 text-center shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-200 mb-1">
                  {searchQuery ? 'No se encontraron resultados' : 'Bóveda vacía'}
                </h3>
                <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Intenta con otro término de búsqueda.'
                    : `Añade tu primera contraseña a ${activeVault?.name || 'la bóveda'}.`}
                </p>
                {!searchQuery && (
                  <button
                    onClick={onAddCredential}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-sm"
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
                      className="bg-[#111624] border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-4 transition shadow-sm space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Crisp Brand Logo */}
                          <PlatformIcon
                            platformName={item.payload.platform}
                            url={item.payload.url}
                            size="md"
                            className="group-hover:scale-105 transition"
                          />

                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2 truncate">
                              <span className="truncate">{item.payload.platform}</span>
                              {item.payload.url && (
                                <a
                                  href={item.payload.url.startsWith('http') ? item.payload.url : `https://${item.payload.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-indigo-400 transition flex-shrink-0"
                                  title="Abrir sitio web"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </h4>

                            {/* Creator & Timestamp Badge */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[9px] font-bold flex items-center justify-center">
                                  {creatorInitial}
                                </span>
                                <span className={isMe ? 'text-indigo-300 font-medium' : 'text-slate-300'}>
                                  {creatorName}
                                </span>
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 text-[11px]">
                                {new Date(item.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onEditCredential({ id: item.id, payload: item.payload })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeCredential(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Data Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {/* Username */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                          <span className="text-slate-300 font-mono truncate mr-2">
                            {item.payload.username}
                          </span>
                          <button
                            onClick={() => handleCopy(item.payload.username, `${item.id}-user`)}
                            className="p-1 rounded text-slate-400 hover:text-white transition flex-shrink-0"
                            title="Copiar usuario"
                          >
                            {isUserCopied ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                          <span className="text-slate-300 font-mono truncate mr-2">
                            {isPasswordVisible ? item.payload.password : '••••••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => togglePasswordVisibility(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-white transition"
                              title={isPasswordVisible ? 'Ocultar' : 'Mostrar'}
                            >
                              {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(item.payload.password, `${item.id}-pass`)}
                              className="p-1 rounded text-slate-400 hover:text-white transition"
                              title="Copiar contraseña"
                            >
                              {isPassCopied ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Notes preview if present */}
                      {item.payload.notes && (
                        <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 italic">
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

      <EditVaultModal
        isOpen={Boolean(editingVault)}
        onClose={() => setEditingVault(null)}
        vault={editingVault}
      />
    </>
  );
};
