'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Lock, Unlock, Eye, EyeOff, LogOut } from 'lucide-react';

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Contraseña maestra incorrecta.');
    }
  };

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Miembro Familiar';
  const email = user?.email || userProfile?.email || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-up text-center">
        {/* Lock Icon */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-950/60 mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1">Desbloquear Bóveda</h2>
        <p className="text-xs text-slate-400 mb-4">
          Ingresa tu contraseña maestra para acceder a tus contraseñas familiares y privadas.
        </p>

        {/* User Badge */}
        {email && (
          <div className="mb-5 p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between text-left shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
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
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition p-1 flex-shrink-0 font-medium"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Contraseña Maestra
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña maestra..."
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs pr-10 shadow-sm"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-slate-400 hover:text-rose-400 transition"
          >
            ¿No eres tú? Cambiar de usuario / Iniciar con otra cuenta
          </button>
        </div>
      </div>
    </div>
  );
};
