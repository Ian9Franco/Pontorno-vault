'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Shield, Lock, KeyRound, Settings, Clock, LogOut, User, Check, Edit3 } from 'lucide-react';

interface NavbarProps {
  onOpenGenerator: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGenerator, onOpenSettings }) => {
  const {
    user,
    userProfile,
    signOut,
    isUnlocked,
    lock,
    timeRemainingSeconds,
    isConfigured,
    updateDisplayName,
  } = useVault();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'Miembro Familiar';
  const email = userProfile?.email || user?.email || '';
  const initial = displayName.substring(0, 2).toUpperCase();

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      await updateDisplayName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
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

        {/* Right: User Identity & Actions */}
        <div className="flex items-center gap-3">
          {/* Active User Card Badge */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center shadow">
                {initial}
              </div>
              <div className="hidden sm:block text-left">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Tu nombre..."
                      className="px-1.5 py-0.5 text-xs bg-gray-950 border border-emerald-500 rounded text-white focus:outline-none w-28"
                      autoFocus
                    />
                    <button type="submit" className="text-emerald-400 hover:text-emerald-300">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1 group cursor-pointer" onClick={() => { setNameInput(displayName); setIsEditingName(true); }}>
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-emerald-300 transition">
                      {displayName}
                    </span>
                    <Edit3 className="w-2.5 h-2.5 text-gray-500 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                )}
                <span className="text-[10px] text-gray-500 block truncate max-w-[130px]">
                  {email}
                </span>
              </div>
            </div>
          )}

          {isUnlocked && (
            <>
              {/* Auto-Lock Indicator */}
              <div
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 text-gray-300 text-xs"
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
                <span className="hidden lg:inline">Generador</span>
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
                <span className="hidden sm:inline">Bloquear</span>
              </button>
            </>
          )}

          {!isUnlocked && isConfigured && user && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Bloqueada</span>
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
