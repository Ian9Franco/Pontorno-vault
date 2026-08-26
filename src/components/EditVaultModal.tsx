'use client';

import React, { useState, useEffect } from 'react';
import { useVault, VaultEntity } from '@/context/VaultContext';
import { FolderLock, Users, X, Edit3, Trash2, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar o Eliminar Bóveda</h3>
              <p className="text-xs text-gray-400">Administra el nombre y permisos de esta bóveda</p>
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

        {!isDeleting ? (
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            {/* Vault Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Nombre de la Bóveda
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
                required
              />
            </div>

            {/* Privacy Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Tipo de Acceso
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setType('SHARED')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    type === 'SHARED'
                      ? 'bg-cyan-950/40 border-cyan-500 text-white ring-1 ring-cyan-500/50'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className={`w-4 h-4 ${type === 'SHARED' ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <span className="font-semibold text-xs text-white">Familiar</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Compartida con los miembros de tu familia.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setType('PERSONAL')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    type === 'PERSONAL'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderLock className={`w-4 h-4 ${type === 'PERSONAL' ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <span className="font-semibold text-xs text-white">Privada</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    Exclusiva para ti.
                  </p>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
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
                  className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Delete Confirmation Step */
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-300">¿Estás seguro de eliminar &quot;{vault.name}&quot;?</p>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  Esta acción borrará la bóveda y todas las contraseñas asociadas a ella de forma permanente.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-950/50 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Eliminando...' : 'Sí, Eliminar Bóveda'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
