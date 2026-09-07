'use client';

import { vaultErrorMessage } from '@/lib/security/vault-access';
import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
<<<<<<< HEAD
import { Unlock, Eye, EyeOff, LogOut, CheckCircle2, LockKeyhole } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { VaultObject } from './vault/VaultObject';

export const UnlockModal: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { unlock, isLoading, accessError, user, userProfile, signOut } = useVault();
=======
import { Lock, Unlock, Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';

export const UnlockModal: React.FC = () => {
  const { unlock, isLoading, accessError, user, userProfile, signOut, isConfigured } = useVault();
>>>>>>> 471b04eac18f633fab0b16004523e379830201d9
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
<<<<<<< HEAD
    <section className="auth-access" aria-labelledby="unlock-title">
      <div className="auth-panel">
        <div className="auth-panel-header auth-panel-header-compact">
          <div className="auth-heading">
            <p className="technical-kicker">PONTORNO VAULT · SESIÓN BLOQUEADA</p>
            <h2 id="unlock-title">Desbloquear bóveda</h2>
            <p>Ingresa tu contraseña maestra para acceder a tus contraseñas familiares y privadas.</p>
          </div>
          <VaultObject interactive />
        </div>

        <div className="auth-status-row" aria-label="Estado de seguridad">
          <span><CheckCircle2 aria-hidden="true" /> Datos cifrados</span>
          <span><LockKeyhole aria-hidden="true" /> Acceso bloqueado</span>
        </div>
=======
    <div className="mx-auto w-full max-w-md px-5 py-8 sm:py-14">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-950/60 mb-4">
          {firstSetup ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1">{firstSetup ? 'Crear secreto de bóveda' : 'Desbloquear Bóveda'}</h2>
        <p className="text-xs text-slate-400 mb-4">
          {firstSetup
            ? 'Google ya confirmó tu identidad. Ahora crea un secreto distinto que se usa solo para cifrar y descifrar en tu dispositivo.'
            : 'Tu sesión identifica quién eres; este secreto independiente abre las claves criptográficas de la bóveda.'}
        </p>
>>>>>>> 471b04eac18f633fab0b16004523e379830201d9

        {email && (
          <div className="auth-user-badge">
            <div className="flex items-center gap-2.5 min-w-0">
<<<<<<< HEAD
              <div className="auth-user-avatar">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-200 block truncate">{displayName}</span>
                <span className="text-[10px] text-slate-400 block truncate">{email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="auth-signout"
              title="Cerrar sesión para entrar con otra cuenta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        )}

        {(error || accessError) && (
          <div role="alert" className="technical-error">
            {error || accessError}
          </div>
        )}
=======
              <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0">{displayName.substring(0, 2).toUpperCase()}</div>
              <div className="min-w-0"><span className="text-xs font-semibold text-slate-200 block truncate">{displayName}</span><span className="text-[10px] text-slate-400 block truncate">{email}</span></div>
            </div>
            <button type="button" onClick={signOut} className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 p-1 flex-shrink-0 font-medium" title="Cerrar sesión"><LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Salir</span></button>
          </div>
        )}

        {(error || accessError) && <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs text-left">{error || accessError}</div>}

        {firstSetup && <div className="mb-4 rounded-xl border border-amber-900/40 bg-amber-950/10 p-3 text-left text-xs leading-relaxed text-amber-100">Pontorno Vault todavía no tiene recuperación criptográfica. Si pierdes este secreto, no podremos reconstruir las claves de tu bóveda.</div>}
>>>>>>> 471b04eac18f633fab0b16004523e379830201d9

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
<<<<<<< HEAD
            <label htmlFor="unlock-password">
              Contraseña Maestra
            </label>
            <div className="relative">
              <input
                id="unlock-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña maestra..."
                className="technical-input auth-input-with-action"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="auth-visibility-button"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || !password}
            className="technical-primary auth-submit"
            whileHover={reduceMotion ? undefined : { y: -2, boxShadow: '0 9px 24px rgba(0, 0, 0, .32)' }}
            whileTap={reduceMotion ? undefined : { y: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Abriendo Bóveda...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Desbloquear Bóveda</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={signOut}
            className="auth-mode-toggle"
          >
            ¿No eres tú? Cambiar de usuario / Iniciar con otra cuenta
          </button>
        </div>
=======
            <label htmlFor="unlock-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">{firstSetup ? 'Secreto de bóveda' : 'Contraseña maestra de bóveda'}</label>
            <div className="relative">
              <input id="unlock-password" autoComplete={firstSetup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={firstSetup ? 'Una frase larga que no uses en Google…' : 'Ingresa tu secreto de bóveda…'} className="vault-input pr-14" required autoFocus minLength={firstSetup ? 12 : undefined} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-200">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>

          {firstSetup && <div><label htmlFor="unlock-confirm" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Repetir secreto</label><input id="unlock-confirm" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="vault-input" required /></div>}

          <button type="submit" disabled={isLoading || !password} className="vault-primary w-full">
            {isLoading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Preparando bóveda…</span></> : <><Unlock className="w-4 h-4" /><span>{firstSetup ? 'Crear y abrir bóveda' : 'Desbloquear Bóveda'}</span></>}
          </button>
        </form>

        <div className="mt-4 text-center"><button type="button" onClick={signOut} className="text-xs text-slate-400 hover:text-rose-400 transition">Cambiar de cuenta</button></div>
>>>>>>> 471b04eac18f633fab0b16004523e379830201d9
      </div>
    </section>
  );
};
