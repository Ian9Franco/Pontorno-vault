'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Shield, Lock, KeyRound, Settings, Clock, LogOut, Check, Edit3, Sparkles } from 'lucide-react';

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
    <header className="border-b border-slate-800/70 bg-[#0e1320]/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-950/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Pontorno Vault
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">Bóveda Familiar de Contraseñas</p>
          </div>
        </div>

        {/* Right: User Identity & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Active User Card Badge */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
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
                      className="px-1.5 py-0.5 text-xs bg-slate-950 border border-indigo-500 rounded text-white focus:outline-none w-28"
                      autoFocus
                    />
                    <button type="submit" className="text-indigo-400 hover:text-indigo-300">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div
                    className="flex items-center gap-1 group cursor-pointer"
                    onClick={() => { setNameInput(displayName); setIsEditingName(true); }}
                    title="Clic para editar tu nombre"
                  >
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition">
                      {displayName}
                    </span>
                    <Edit3 className="w-2.5 h-2.5 text-slate-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                )}
                <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                  {email}
                </span>
              </div>
            </div>
          )}

          {isUnlocked && (
            <>
              {/* Auto-Lock Indicator */}
              <div
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-slate-300 text-xs shadow-sm"
                title="Tiempo restante antes del bloqueo automático por inactividad"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px]">Bloqueo en <strong>{formatCountdown(timeRemainingSeconds)}</strong></span>
              </div>

              {/* Password Generator Button */}
              <button
                onClick={onOpenGenerator}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold border border-slate-700/70 transition shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Generador</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 transition shadow-sm"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Lock Button */}
              <button
                onClick={lock}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold transition shadow-sm"
                title="Bloquear y ocultar contraseñas"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bloquear</span>
              </button>
            </>
          )}

          {user && (
            <button
              onClick={signOut}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
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
