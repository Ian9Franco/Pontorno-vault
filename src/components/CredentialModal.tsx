'use client';

import React, { useState, useEffect } from 'react';
import { CredentialPayload } from '@/lib/crypto';
import { generateSecurePassword, estimatePasswordStrength } from '@/lib/security/generator';
import { findPlatformByNameOrDomain, getPlatformLogoUrl, PlatformDefinition } from '@/lib/constants/platforms';
import { PlatformSelectModal } from './PlatformSelectModal';
import { X, Eye, EyeOff, Sparkles, Globe, User, Lock, FileText, Check, LayoutGrid } from 'lucide-react';

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CredentialPayload, credentialId?: string) => Promise<void>;
  initialData?: { id: string; payload: CredentialPayload } | null;
}

export const CredentialModal: React.FC<CredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
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
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const matchedPlatform = findPlatformByNameOrDomain(platform);
  const logoUrl = getPlatformLogoUrl(matchedPlatform || null, url);

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
        initialData?.id
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const strength = estimatePasswordStrength(password);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
        <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {matchedPlatform ? (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center p-2 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: matchedPlatform.bgColor }}
                >
                  <img
                    src={logoUrl}
                    alt={matchedPlatform.name}
                    className="w-full h-full object-contain filter brightness-0 invert"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm">
                  {platform ? platform.substring(0, 2).toUpperCase() : <Globe className="w-5 h-5" />}
                </div>
              )}
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
              <div className="relative">
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="Ej. Netflix, Spotify, Gmail, Disney+, etc."
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm pr-10"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsPlatformModalOpen(true)}
                  title="Abrir catálogo de plataformas"
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-emerald-400 transition p-1"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Usuario / Email *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. familia@gmail.com o mi_usuario"
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Contraseña *
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3 h-3" /> Generar Segura
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña..."
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono text-sm pr-10"
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
                <div className="mt-1.5 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" /> URL del Sitio Web (Opcional)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400" /> Notas Seguras (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Códigos de recuperación, PIN o instrucciones..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold border border-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cifrando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{initialData ? 'Guardar Cambios' : 'Cifrar y Guardar'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Selección de Plataformas con Buscador */}
      <PlatformSelectModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        onSelect={handleSelectPlatform}
      />
    </>
  );
};
