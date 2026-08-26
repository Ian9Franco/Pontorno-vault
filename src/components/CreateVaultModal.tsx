'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { FolderLock, Users, X, Plus, ShieldCheck, AlertCircle } from 'lucide-react';

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateVaultModal: React.FC<CreateVaultModalProps> = ({ isOpen, onClose }) => {
  const { createVault } = useVault();
  const [name, setName] = useState('');
  const [type, setType] = useState<'PERSONAL' | 'SHARED'>('SHARED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await createVault(name.trim(), type);
      setName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la bóveda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Crear Nueva Bóveda</h3>
              <p className="text-xs text-gray-400">Organiza tus credenciales familiares o privadas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Vault Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Nombre de la Bóveda
            </label>
            <input
              type="text"
              placeholder="Ej. Streaming y Servicios, Cuentas Bancarias, Casa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
              required
              autoFocus
            />
          </div>

          {/* Vault Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
              Tipo de Privacidad y Acceso
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Shared / Family Vault Option */}
              <button
                type="button"
                onClick={() => setType('SHARED')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  type === 'SHARED'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/50'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className={`w-4 h-4 ${type === 'SHARED' ? 'text-cyan-400' : 'text-gray-500'}`} />
                  <span className="font-semibold text-xs text-white">Familiar</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  Compartida con todos los miembros de la familia.
                </p>
              </button>

              {/* Personal / Private Vault Option */}
              <button
                type="button"
                onClick={() => setType('PERSONAL')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  type === 'PERSONAL'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FolderLock className={`w-4 h-4 ${type === 'PERSONAL' ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span className="font-semibold text-xs text-white">Privada</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  100% Exclusiva para ti. Ningún familiar puede verla.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Cifrando Bóveda...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Crear Bóveda</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
