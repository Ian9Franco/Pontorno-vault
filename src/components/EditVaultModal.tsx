'use client';

import React, { useState, useEffect } from 'react';
import { useVault, VaultEntity } from '@/context/VaultContext';
import { FolderLock, Users, X, Edit3, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';

interface EditVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultEntity | null;
}

export const EditVaultModal: React.FC<EditVaultModalProps> = ({ isOpen, onClose, vault }) => {
  const { updateVault, removeVault, vaults } = useVault();
  const [name, setName] = useState('');
  const [type, setType] = useState<'PERSONAL' | 'SHARED'>('SHARED');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vault) {
      setName(vault.name);
      setType(vault.type);
      setIsDeleting(false);
      setError(null);
    }
  }, [vault, isOpen]);

  if (!isOpen || !vault) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await updateVault(vault.id, name.trim(), type);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar bóveda');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (vaults.length <= 1) {
      setError('No puedes eliminar la única bóveda que tienes activa.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await removeVault(vault.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar bóveda');
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
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Editar o Eliminar Bóveda</h3>
              <p className="text-xs text-slate-400">Administra el nombre y tipo de acceso</p>
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

        {!isDeleting ? (
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            {/* Vault Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Nombre de la Bóveda
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
                required
              />
            </div>

            {/* Privacy Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Tipo de Acceso
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setType('SHARED')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    type === 'SHARED'
                      ? 'bg-sky-950/40 border-sky-500 text-white ring-1 ring-sky-500/50'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className={`w-4 h-4 ${type === 'SHARED' ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span className="font-semibold text-xs text-slate-100">Familiar</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Compartida con todos los miembros de la familia.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setType('PERSONAL')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    type === 'PERSONAL'
                      ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderLock className={`w-4 h-4 ${type === 'PERSONAL' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="font-semibold text-xs text-slate-100">Privada</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Exclusiva para ti.
                  </p>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/40 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Bóveda</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Delete Confirmation Step */
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-300">¿Estás seguro de eliminar &quot;{vault.name}&quot;?</p>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  Esta acción borrará la bóveda y todas las contraseñas asociadas a ella permanentemente.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
