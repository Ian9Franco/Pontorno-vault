'use client';

import { vaultErrorMessage } from '@/lib/security/vault-access';
import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Unlock, Eye, EyeOff, LogOut, CheckCircle2, LockKeyhole } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { VaultObject } from './vault/VaultObject';

export const UnlockModal: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { unlock, isLoading, accessError, user, userProfile, signOut } = useVault();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await unlock(password);
    } catch (err: unknown) {
      setError(vaultErrorMessage(err));
    }
  };

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Miembro Familiar';
  const email = user?.email || userProfile?.email || '';

  return (
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

        {/* User Badge */}
        {email && (
          <div className="auth-user-badge">
            <div className="flex items-center gap-2.5 min-w-0">
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
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
      </div>
    </section>
  );
};
