'use client';

import { vaultErrorMessage } from '@/lib/security/vault-access';
import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Lock, Unlock, Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';

export const UnlockModal: React.FC = () => {
  const { unlock, isLoading, accessError, user, userProfile, signOut, isConfigured } = useVault();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstSetup = !isConfigured;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (firstSetup && password.length < 12) {
      setError('Usa una frase de bóveda de al menos 12 caracteres.');
      return;
    }
    if (firstSetup && password !== confirmation) {
      setError('Las frases de bóveda no coinciden.');
      return;
    }

    try {
      await unlock(password);
    } catch (err: unknown) {
      setError(vaultErrorMessage(err));
    }
  };

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Miembro Familiar';
  const email = user?.email || userProfile?.email || '';

  return (
    <section className="mx-auto w-full max-w-md px-5 py-8 sm:py-14" aria-labelledby="unlock-title">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/60">
          {firstSetup ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </div>

        <h2 id="unlock-title" className="mb-1 text-xl font-bold text-slate-100">{firstSetup ? 'Crear secreto de bóveda' : 'Desbloquear Bóveda'}</h2>
        <p className="mb-4 text-xs text-slate-400">
          {firstSetup
            ? 'Google ya confirmó tu identidad. Ahora crea un secreto distinto que se usa solo para cifrar y descifrar en tu dispositivo.'
            : 'Tu sesión identifica quién eres; este secreto independiente abre las claves criptográficas de la bóveda.'}
        </p>

        {email && (
          <div className="auth-user-badge">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-indigo-800/60 bg-indigo-950 text-xs font-bold text-indigo-400">{displayName.substring(0, 2).toUpperCase()}</div>
              <div className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-200">{displayName}</span><span className="block truncate text-[10px] text-slate-400">{email}</span></div>
            </div>
            <button type="button" onClick={signOut} className="flex flex-shrink-0 items-center gap-1 p-1 text-[11px] font-medium text-slate-400 hover:text-rose-400" title="Cerrar sesión"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Salir</span></button>
          </div>
        )}

        {(error || accessError) && <div role="alert" className="mb-4 rounded-xl border border-rose-800/40 bg-rose-950/50 p-3 text-left text-xs text-rose-300">{error || accessError}</div>}

        {firstSetup && <div className="mb-4 rounded-xl border border-amber-900/40 bg-amber-950/10 p-3 text-left text-xs leading-relaxed text-amber-100">Pontorno Vault todavía no tiene recuperación criptográfica. Si pierdes este secreto, no podremos reconstruir las claves de tu bóveda.</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label htmlFor="unlock-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">{firstSetup ? 'Secreto de bóveda' : 'Contraseña maestra de bóveda'}</label>
            <div className="relative">
              <input id="unlock-password" autoComplete={firstSetup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={firstSetup ? 'Una frase larga que no uses en Google…' : 'Ingresa tu secreto de bóveda…'} className="vault-input pr-14" required autoFocus minLength={firstSetup ? 12 : undefined} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-200">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>

          {firstSetup && <div><label htmlFor="unlock-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">Repetir secreto</label><input id="unlock-confirm" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="vault-input" required /></div>}

          <button type="submit" disabled={isLoading || !password} className="vault-primary w-full">
            {isLoading ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Preparando bóveda…</span></> : <><Unlock className="h-4 w-4" /><span>{firstSetup ? 'Crear y abrir bóveda' : 'Desbloquear Bóveda'}</span></>}
          </button>
        </form>

        <div className="mt-4 text-center"><button type="button" onClick={signOut} className="text-xs text-slate-400 transition hover:text-rose-400">Cambiar de cuenta</button></div>
      </div>
    </section>
  );
};
