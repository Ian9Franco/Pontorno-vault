'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useVault } from '@/context/VaultContext';
import { Lock, KeyRound, Settings, LogOut, Menu, X } from 'lucide-react';

interface NavbarProps { onOpenGenerator: () => void; onOpenSettings: () => void; }
export const Navbar: React.FC<NavbarProps> = ({ onOpenGenerator, onOpenSettings }) => {
  const { isUnlocked, isSupabaseConnected, lock, signOut, userProfile } = useVault();
  const [open, setOpen] = useState(false);
  const run = (action: () => void) => { setOpen(false); action(); };
  return <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-[#0b0f19]/95 backdrop-blur-xl">
    <div className="relative mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <Image src="/PV_ICON.png" width={34} height={34} alt="" priority className="navbar-brand-icon" />
        <div className="min-w-0"><h1 className="whitespace-nowrap text-sm font-semibold tracking-tight text-slate-100 sm:text-base">Pontorno Vault</h1>
          <p className="truncate text-xs text-slate-400"><span className="sm:hidden">{isSupabaseConnected ? 'Tu bóveda' : 'Demo local'}</span><span className="hidden sm:inline">{isSupabaseConnected ? 'Tus contraseñas, contigo' : 'Demo · Solo en este navegador'}</span></p></div>
      </div>
      {isUnlocked && <nav aria-label="Herramientas" className="flex shrink-0 items-center gap-1">
        <button onClick={() => run(lock)} title="Bloquear" className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm text-slate-300 hover:bg-slate-800 sm:gap-2 sm:px-3"><Lock className="h-4 w-4" /><span>Bloquear</span></button>
        <button onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="account-tools"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        {open && <div id="account-tools" className="absolute right-4 top-full mt-2 w-64 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
          <p className="truncate border-b border-slate-800 px-3 py-3 text-sm text-slate-400">{userProfile?.displayName || 'Tu cuenta'}</p>
          <button onClick={() => run(onOpenGenerator)} className="vault-menu-item"><KeyRound className="h-5 w-5" /> Generar contraseña</button>
          <button onClick={() => run(onOpenSettings)} className="vault-menu-item"><Settings className="h-5 w-5" /> Configuración</button>
          {isSupabaseConnected && <button onClick={() => { setOpen(false); void signOut(); }} className="vault-menu-item"><LogOut className="h-5 w-5" /> Cerrar sesión</button>}
        </div>}
      </nav>}
    </div>
  </header>;
};
