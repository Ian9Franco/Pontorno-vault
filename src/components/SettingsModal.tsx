'use client';

import { vaultErrorMessage } from '@/lib/security/vault-access';
import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { supabase } from '@/lib/supabase/client';
import { KeyRound, Shield, Clock, Check, X, RefreshCw, User, Link2, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
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
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const providers = Array.isArray(user?.app_metadata?.providers) ? user?.app_metadata?.providers as string[] : [];
  const googleLinked = providers.includes('google') || Boolean(user?.identities?.some(identity => identity.provider === 'google'));
  const legacySyncedAccount = isSupabaseConnected && !googleLinked;

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || isSavingProfile) return;
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
  };

  const linkGoogle = async () => {
    if (!supabase || linking || googleLinked) return;
    setLinkError(null);
    setLinking(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (error) {
      setLinkError(vaultErrorMessage(error));
      setLinking(false);
    }
  };

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotateError(null);
    setRotateSuccess(false);

    if (legacySyncedAccount) {
      setRotateError('Vincula Google antes de cambiar el secreto de bóveda. Así evitamos desincronizar la contraseña de Auth y la clave criptográfica heredada.');
      return;
    }
    if (newPassword.length < 12) {
      setRotateError('El nuevo secreto de bóveda debe tener al menos 12 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRotateError('Los secretos no coinciden.');
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
      <div className="w-full max-w-lg bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-7 animate-slide-up max-h-[90vh] overflow-y-auto unified-modal">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2"><Shield className="w-5 h-5 text-[#9aead6]" /> Configuración de seguridad</h3>
          <button onClick={onClose} aria-label="Cerrar configuración" className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-6">
          {isSupabaseConnected && <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"><Link2 className="w-4 h-4 text-emerald-400" /> Identidad de acceso</h4>
            {googleLinked ? (
              <div className="mt-3 flex gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-100"><ShieldCheck className="h-4 w-4 shrink-0" /><span>Google está vinculado. La identidad de acceso y el secreto criptográfico de la bóveda ya son credenciales separadas.</span></div>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100">
                <p>Esta cuenta todavía usa el flujo legado. Vincula Google conservando el mismo usuario de Supabase para mantener tus bóvedas y políticas RLS.</p>
                <button type="button" disabled={linking} onClick={linkGoogle} className="mt-3 min-h-11 rounded-xl bg-slate-800 px-4 font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50">{linking ? 'Redirigiendo…' : 'Vincular Google'}</button>
                {linkError && <p role="alert" className="mt-2 text-rose-300">{linkError}</p>}
                <p className="mt-2 text-slate-400">Requiere Google habilitado y Manual Identity Linking activado en Supabase Auth.</p>
              </div>
            )}
          </section>}

          <section className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"><User className="w-4 h-4 text-[#9aead6]" /> Nombre visible</h4>
            {profileError && <p role="alert" className="mb-3 text-xs text-rose-300">{profileError}</p>}
            {nameSaved && <div className="mb-3 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-[#baf6e7] text-xs flex items-center gap-2"><Check className="w-4 h-4" /> Nombre actualizado.</div>}
            <form onSubmit={handleSaveProfile} className="flex gap-2">
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre o alias" className="vault-input flex-1" required />
              <button type="submit" disabled={isSavingProfile} className="technical-primary">{isSavingProfile ? 'Guardando…' : 'Guardar'}</button>
            </form>
          </section>

          <section className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#9aead6]" /> Bloqueo automático</h4>
            <p className="text-xs text-slate-400 mb-3">Elimina claves y plaintext del estado de la aplicación después de inactividad.</p>
            <div className="grid grid-cols-4 gap-2">{[1, 5, 15, 30].map((mins) => <button key={mins} type="button" onClick={() => setAutoLockMinutes(mins)} className={`py-2 text-xs font-semibold rounded-xl border ${autoLockMinutes === mins ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>{mins} min</button>)}</div>
          </section>

          <section className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-[#9aead6]" /> Cambiar secreto de bóveda</h4>
            <p className="text-xs text-slate-400 mb-3">Esto vuelve a envolver tu UserMasterKey. No cambia la contraseña de Google ni requiere recifrar las credenciales.</p>
            {legacySyncedAccount && <p className="mb-3 rounded-xl border border-amber-900/40 bg-amber-950/10 p-3 text-xs text-amber-100">Bloqueado hasta vincular Google: cambiarlo antes podría dejar el acceso legado y el cifrado usando secretos diferentes.</p>}
            {rotateSuccess && <div className="mb-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs flex items-center gap-2"><Check className="w-4 h-4" /> Secreto de bóveda actualizado.</div>}
            {rotateError && <div role="alert" className="mb-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs">{rotateError}</div>}
            <form onSubmit={handleRotate} className="space-y-3">
              <input type="password" autoComplete="current-password" placeholder="Secreto de bóveda actual" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="vault-input" required />
              <input type="password" autoComplete="new-password" placeholder="Nuevo secreto de bóveda" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="vault-input" required minLength={12} />
              <input type="password" autoComplete="new-password" placeholder="Repetir nuevo secreto" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="vault-input" required />
              <button type="submit" disabled={isRotating || legacySyncedAccount || !oldPassword || !newPassword} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 flex items-center justify-center gap-1.5">{isRotating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Actualizando…</> : <><KeyRound className="w-3.5 h-3.5 text-[#9aead6]" /> Actualizar secreto</>}</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
