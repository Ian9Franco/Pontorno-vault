'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { KeyRound, Shield, Clock, Database, Check, X, RefreshCw, User, Edit3 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    userProfile,
    updateDisplayName,
    autoLockMinutes,
    setAutoLockMinutes,
    changeMasterPassword,
    isSupabaseConnected,
  } = useVault();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [nameSaved, setNameSaved] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isRotating, setIsRotating] = useState(false);
  const [rotateSuccess, setRotateSuccess] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      await updateDisplayName(displayName.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    }
  };

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotateError(null);
    setRotateSuccess(false);

    if (newPassword.length < 8) {
      setRotateError('La nueva contraseña maestra debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setRotateError('Las contraseñas no coinciden.');
      return;
    }

    setIsRotating(true);
    try {
      await changeMasterPassword(oldPassword, newPassword);
      setRotateSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      setRotateError(err instanceof Error ? err.message : 'Error al rotar contraseña');
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" /> Configuración de Usuario y Seguridad
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Edit User Profile Name */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-400" /> Perfil del Miembro Familiar
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Este nombre identifica quién agregó o editó cada contraseña en la bóveda familiar.
            </p>

            {nameSaved && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Nombre de usuario actualizado con éxito.</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre o alias (ej. Ian, Papá, Mamá)..."
                className="flex-1 px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                required
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </form>
          </div>

          {/* Auto-Lock Settings */}
          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> Bloqueo Automático por Inactividad
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Destruye las claves y datos descifrados en memoria RAM tras un periodo de inactividad.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAutoLockMinutes(mins)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    autoLockMinutes === mins
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Master Password Rotation */}
          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" /> Cambiar Contraseña Maestra
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Gracias al Envelope Encryption, cambiar tu contraseña maestra solo re-cifra tu <code>UserMasterKey</code> con una nueva <code>KEK</code> sin alterar las credenciales compartidas ni privadas.
            </p>

            {rotateSuccess && (
              <div className="mb-3 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Contraseña maestra rotada con éxito.</span>
              </div>
            )}

            {rotateError && (
              <div className="mb-3 p-3 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs">
                {rotateError}
              </div>
            )}

            <form onSubmit={handleRotate} className="space-y-3">
              <input
                type="password"
                placeholder="Contraseña maestra actual..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                required
              />
              <input
                type="password"
                placeholder="Nueva contraseña maestra..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                required
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña..."
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                required
              />

              <button
                type="submit"
                disabled={isRotating || !oldPassword || !newPassword}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isRotating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-cifrando UserMasterKey (Argon2id)...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Actualizar Contraseña Maestra</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Zero-Knowledge Architecture Spec */}
          <div className="pt-4 border-t border-gray-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-400" /> Estado del Servidor
            </h4>
            <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs space-y-1.5 text-gray-400">
              <div className="flex justify-between">
                <span>Almacenamiento:</span>
                <span className="font-mono text-emerald-400">
                  {isSupabaseConnected ? 'Supabase PostgreSQL + RLS' : 'Local Standalone'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bóvedas activas:</span>
                <span className="font-mono text-cyan-400">1 Familiar Compartida + 1 Personal Privada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
