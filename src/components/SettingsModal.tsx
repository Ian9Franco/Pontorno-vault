'use client';

import { vaultErrorMessage } from '@/lib/security/vault-access';
import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { KeyRound, Shield, Clock, Database, Check, X, RefreshCw, User, Edit3, Lock } from 'lucide-react';

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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
      if (isSavingProfile) return;
      setProfileError(null);
      setNameSaved(false);
      setIsSavingProfile(true);
      try {
        await updateDisplayName(displayName.trim());
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2500);
      } catch (error) {
        setProfileError(vaultErrorMessage(error));
      } finally {
        setIsSavingProfile(false);
      }
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
      setRotateError(vaultErrorMessage(err));
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="vault-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-lg bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-7 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" /> Configuración de Cuenta
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Edit User Profile Name */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-400" /> Tu Nombre o Alias Familiar
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Este nombre identifica quién creó o editó cada contraseña en la bóveda familiar.
            </p>

            {profileError && <p role="alert" className="mb-3 text-xs text-rose-300">{profileError}</p>}
            {nameSaved && (
              <div className="mb-3 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Nombre actualizado correctamente.</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre o alias (ej. Ian, Papá, Mamá)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </form>
          </div>

          {/* Auto-Lock Settings */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" /> Bloqueo Automático por Inactividad
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Oculta tus contraseñas automáticamente si dejas la app inactiva.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAutoLockMinutes(mins)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    autoLockMinutes === mins
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Master Password Change */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-400" /> Cambiar Contraseña Maestra
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Actualiza tu clave principal sin afectar las contraseñas guardadas en tus bóvedas.
            </p>

            {rotateSuccess && (
              <div className="mb-3 p-3 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Contraseña maestra cambiada con éxito.</span>
              </div>
            )}

            {rotateError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs">
                {rotateError}
              </div>
            )}

            <form onSubmit={handleRotate} className="space-y-3">
              <input
                type="password"
                placeholder="Contraseña maestra actual..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />
              <input
                type="password"
                placeholder="Nueva contraseña maestra..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña..."
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />

              <button
                type="submit"
                disabled={isRotating || !oldPassword || !newPassword}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isRotating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Actualizar Contraseña Maestra</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
