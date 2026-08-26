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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-7 animate-slide-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Crear Nueva Bóveda</h3>
              <p className="text-xs text-slate-400">Organiza tus contraseñas familiares o privadas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Vault Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nombre de la Bóveda
            </label>
            <input
              type="text"
              placeholder="Ej. Streaming y Entretenimiento, Bancos, Casa..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
              required
              autoFocus
            />
          </div>

          {/* Vault Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Tipo de Privacidad y Acceso
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Shared / Family Vault Option */}
              <button
                type="button"
                onClick={() => setType('SHARED')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  type === 'SHARED'
                    ? 'bg-sky-950/40 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className={`w-4 h-4 ${type === 'SHARED' ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span className="font-semibold text-xs text-slate-100">Familiar</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Compartida con todos los miembros de la familia.
                </p>
              </button>

              {/* Personal / Private Vault Option */}
              <button
                type="button"
                onClick={() => setType('PERSONAL')}
                className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                  type === 'PERSONAL'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FolderLock className={`w-4 h-4 ${type === 'PERSONAL' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="font-semibold text-xs text-slate-100">Privada</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Exclusiva para ti.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creando...</span>
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
