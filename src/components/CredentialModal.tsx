'use client';

import React, { useState, useEffect } from 'react';
import { useVault } from '@/context/VaultContext';
import { CredentialPayload } from '@/lib/crypto';
import { generateSecurePassword, estimatePasswordStrength } from '@/lib/security/generator';
import { PlatformDefinition } from '@/lib/constants/platforms';
import { PlatformSelectModal } from './PlatformSelectModal';
import { PlatformIcon } from './PlatformIcon';
import { X, Eye, EyeOff, Sparkles, Globe, User, Lock, FileText, LayoutGrid, Users, FolderLock } from 'lucide-react';

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CredentialPayload, credentialId?: string, targetVaultId?: string) => Promise<void>;
  initialData?: { id: string; payload: CredentialPayload } | null;
}

export const CredentialModal: React.FC<CredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { vaults, activeVaultId } = useVault();
  const [targetVaultId, setTargetVaultId] = useState<string>(activeVaultId || vaults[0]?.id || '');
  const [platform, setPlatform] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setPlatform(initialData.payload.platform || '');
      setUsername(initialData.payload.username || '');
      setPassword(initialData.payload.password || '');
      setUrl(initialData.payload.url || '');
      setNotes(initialData.payload.notes || '');
    } else {
      setPlatform('');
      setUsername('');
      setPassword('');
      setUrl('');
      setNotes('');
      setTargetVaultId(activeVaultId || vaults[0]?.id || '');
    }
  }, [initialData, isOpen, activeVaultId, vaults]);

  if (!isOpen) return null;

  const handleSelectPlatform = (selected: PlatformDefinition) => {
    setPlatform(selected.name);
    if (!url) {
      setUrl(`https://${selected.domain}`);
    }
  };

  const handleGenerate = () => {
    const pwd = generateSecurePassword({
      length: 20,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
    });
    setPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !username || !password) {
      setError('Por favor completa los campos requeridos (Servicio, Usuario y Contraseña).');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(
        {
          platform,
          username,
          password,
          url,
          notes,
        },
        initialData?.id,
        targetVaultId
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const strength = estimatePasswordStrength(password);
  const selectedVault = vaults.find((v) => v.id === targetVaultId);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        <div className="w-full max-w-lg bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-7 animate-slide-up max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <PlatformIcon platformName={platform} url={url} size="md" />
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {initialData ? 'Editar Contraseña' : 'Nueva Contraseña'}
                </h3>
                <p className="text-xs text-slate-400">Guarda de forma segura tus datos de acceso</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vault Destination Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                {selectedVault?.type === 'SHARED' ? (
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <FolderLock className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>Guardar en la Bóveda *</span>
              </label>
              <select
                value={targetVaultId}
                onChange={(e) => setTargetVaultId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
              >
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.type === 'SHARED' ? '[Familiar] ' : '[Privada] '} {v.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 block mt-1">
                {selectedVault?.type === 'SHARED'
                  ? 'Esta contraseña será visible para los miembros de tu familia.'
                  : 'Esta contraseña es privada y solo tú la podrás ver.'}
              </span>
            </div>

            {/* Platform / Service */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" /> Plataforma o Servicio *
                </label>
                <button
                  type="button"
                  onClick={() => setIsPlatformModalOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition font-medium"
                >
                  <LayoutGrid className="w-3 h-3" /> Elegir de catálogo
                </button>
              </div>
              <input
                type="text"
                placeholder="Ej. Disney+, Netflix, Spotify, Gmail, Santander..."
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
                required
                autoFocus
              />
            </div>

            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Usuario o Correo *
              </label>
              <input
                type="text"
                placeholder="usuario@ejemplo.com o nombre_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" /> Contraseña *
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition font-medium"
                >
                  <Sparkles className="w-3 h-3" /> Generar segura
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs pr-10 shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Nivel de seguridad:</span>
                    <span className="font-medium text-slate-200">{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Sitio Web (Opcional)
              </label>
              <input
                type="text"
                placeholder="https://ejemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Notas o PIN adicional
              </label>
              <textarea
                placeholder="PIN del perfil, preguntas de seguridad, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs resize-none shadow-sm"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Contraseña</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Catalog modal */}
      <PlatformSelectModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        onSelect={handleSelectPlatform}
      />
    </>
  );
};
