'use client';

import React from 'react';
import { useVault } from '@/context/VaultContext';
import { Shield, Lock, KeyRound, Settings, Clock, LogOut, User } from 'lucide-react';

interface NavbarProps {
  onOpenGenerator: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGenerator, onOpenSettings }) => {
  const {
    user,
    signOut,
    isUnlocked,
    lock,
    timeRemainingSeconds,
    isConfigured,
    isSupabaseConnected,
  } = useVault();

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950/50">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
              Family Vault
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-medium tracking-wide">
                Zero-Knowledge
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-400">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[140px] text-gray-200">{user.email}</span>
            </div>
          )}

          {isUnlocked && (
            <>
              {/* Auto-Lock Indicator */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 text-gray-300 text-xs"
                title="Tiempo restante antes del bloqueo automático por inactividad"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Auto-Lock: <strong>{formatCountdown(timeRemainingSeconds)}</strong></span>
              </div>

              {/* Password Generator Button */}
              <button
                onClick={onOpenGenerator}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 text-sm font-medium border border-gray-700 transition"
              >
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span className="hidden md:inline">Generador</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white border border-gray-700 transition"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Lock Button */}
              <button
                onClick={lock}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-sm font-medium transition"
              >
                <Lock className="w-4 h-4" />
                <span>Bloquear</span>
              </button>
            </>
          )}

          {!isUnlocked && isConfigured && user && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Bóveda Bloqueada</span>
            </div>
          )}

          {user && (
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-900 border border-transparent hover:border-gray-800 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
