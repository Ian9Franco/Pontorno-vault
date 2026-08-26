'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Lock, Unlock, Eye, EyeOff, User, LogOut } from 'lucide-react';

export const UnlockModal: React.FC = () => {
  const { unlock, isLoading, user, userProfile, signOut } = useVault();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await unlock(password);
    } catch {
      setError('Contraseña maestra incorrecta. Verificación criptográfica fallida.');
    }
  };

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Miembro Familiar';
  const email = user?.email || userProfile?.email || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-slide-up text-center">
        {/* Lock Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/60 mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Desbloquear Family Vault</h2>
        <p className="text-xs text-gray-400 mb-4">
          Ingresa tu contraseña maestra para descifrar tu bóveda en el navegador.
        </p>

        {/* User Badge */}
        {email && (
          <div className="mb-5 p-2.5 bg-gray-950/90 border border-gray-800 rounded-xl flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                {displayName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-gray-200 block truncate">{displayName}</span>
                <span className="text-[10px] text-gray-500 block truncate">{email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="text-[11px] text-gray-400 hover:text-rose-400 flex items-center gap-1 transition p-1 flex-shrink-0"
              title="Cerrar sesión para entrar con otra cuenta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Contraseña Maestra
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña maestra..."
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm pr-10"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Descifrando Bóveda...</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                <span>Desbloquear Bóveda</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-rose-400 transition"
          >
            ¿No eres tú? Cambiar de usuario / Iniciar con otra cuenta
          </button>
        </div>
      </div>
    </div>
  );
};
