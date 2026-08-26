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
      setError('Por favor completa los campos requeridos (Plataforma, Usuario y Contraseña).');
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
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
        <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <PlatformIcon platformName={platform} url={url} size="md" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  {initialData ? 'Editar Credencial' : 'Nueva Credencial'}
                </h3>
                <p className="text-xs text-gray-400">Cifrado de extremo a extremo con AES-256-GCM</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vault Destination Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                {selectedVault?.type === 'SHARED' ? (
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Guardar en la Bóveda *</span>
              </label>
              <select
                value={targetVaultId}
                onChange={(e) => setTargetVaultId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.type === 'SHARED' ? '👨‍👩‍👧‍👦 Familiar: ' : '🔒 Privada: '} {v.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-gray-500 block mt-1">
                {selectedVault?.type === 'SHARED'
                  ? 'Esta contraseña será visible para todos los miembros de tu familia.'
                  : 'Esta contraseña es 100% privada y solo tú la podrás ver.'}
              </span>
            </div>

            {/* Platform / Service */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" /> Plataforma / Servicio *
                </label>
                <button
                  type="button"
                  onClick={() => setIsPlatformModalOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                >
                  <LayoutGrid className="w-3 h-3" /> Elegir de catálogo
                </button>
              </div>
              <input
                type="text"
                placeholder="Ej. Disney+, Netflix, Spotify, Gmail, Santander..."
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
                required
                autoFocus
              />
            </div>

            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Usuario / Correo *
              </label>
              <input
                type="text"
                placeholder="usuario@ejemplo.com o nombre_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Contraseña *
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition font-medium"
                >
                  <Sparkles className="w-3 h-3" /> Generar segura
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña segura..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Fortaleza:</span>
                    <span className="font-medium text-gray-200">{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" /> Enlace / URL (Opcional)
              </label>
              <input
                type="text"
                placeholder="https://ejemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400" /> Notas o PIN de Recuperación (Cifradas)
              </label>
              <textarea
                placeholder="PIN del perfil, preguntas de seguridad, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cifrando y Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Credencial</span>
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
