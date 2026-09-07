'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { Shield, Eye, EyeOff, ArrowRight, Monitor } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { unifiedAuth, isSupabaseConnected, isConfigured, isLoading } = useVault();
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = !isSupabaseConnected;
  const creating = local ? !isConfigured : createAccount;
  const title = creating ? (local ? 'Tu primera bóveda' : 'Crea tu cuenta') : 'Bienvenido de nuevo';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || isLoading) return;
    setError(null);
    if (creating && password.length < 8) {
      setError('Elige una contraseña de al menos 8 caracteres.');
      return;
    }
    if (creating && password !== confirmation) {
      setError('Las contraseñas no coinciden. Escríbelas de nuevo.');
      return;
    }
    setBusy(true);
    try {
      await unifiedAuth({ email: local ? '' : email.trim().toLowerCase(), masterPassword: password,
        displayName: local ? 'Yo' : email.split('@')[0], isSignUp: creating });
    } catch (err) {
      setError(vaultErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 py-8 sm:py-14" aria-labelledby="access-title">
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Shield aria-hidden="true" /></div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">{local ? 'Demo local' : 'Tu espacio privado'}</p>
        <h2 id="access-title" className="text-3xl font-semibold tracking-tight text-slate-100">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-400">{creating
          ? 'Una sola contraseña para proteger las demás. Elígela tú y guárdala en un lugar seguro.'
          : 'Introduce tu contraseña maestra para abrir tus contraseñas.'}</p>
      </div>

      {local && <div className="mb-6 flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
        <div><p className="font-medium">Solo en este navegador</p><p className="mt-1 text-slate-400">{creating
          ? 'Todavía no hay una bóveda aquí. Puedes crearla sin correo ni cuenta.'
          : 'Tu bóveda está guardada aquí. No necesitas un correo para abrirla.'} No se sincroniza; si borras los datos del navegador, la perderás.</p></div>
      </div>}

      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-800/50 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        {!local && <div>
          <label htmlFor="access-email" className="mb-2 block text-sm font-medium text-slate-200">Correo electrónico</label>
          <input id="access-email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
            value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" required className="vault-input" />
        </div>}
        <div>
          <label htmlFor="access-password" className="mb-2 block text-sm font-medium text-slate-200">{creating ? 'Elige tu contraseña maestra' : 'Contraseña maestra'}</label>
          <div className="relative">
            <input id="access-password" type={visible ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'}
              value={password} onChange={e => setPassword(e.target.value)} required minLength={creating ? 8 : undefined}
              aria-describedby={creating ? 'password-guidance' : undefined} className="vault-input pr-14" />
            <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:text-white">
              {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {creating && <p id="password-guidance" className="mt-2 text-sm text-slate-400">Usa una frase larga que recuerdes. No podremos recuperarla por ti.</p>}
        </div>
        {creating && <div>
          <label htmlFor="access-confirm" className="mb-2 block text-sm font-medium text-slate-200">Repite la contraseña</label>
          <input id="access-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation}
            onChange={e => setConfirmation(e.target.value)} required className="vault-input" />
        </div>}
        <button type="submit" disabled={busy || isLoading} className="vault-primary w-full">
          {busy ? 'Un momento…' : isLoading ? 'Comprobando este navegador…' : creating ? (local ? 'Crear mi bóveda' : 'Crear cuenta') : 'Abrir mi bóveda'}
          {!busy && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </button>
      </form>
      {!local && <button type="button" disabled={busy} onClick={() => { setCreateAccount(!createAccount); setError(null); setConfirmation(''); }}
        className="mt-4 min-h-12 w-full rounded-xl px-3 text-sm text-indigo-300 hover:bg-slate-900">
        {creating ? 'Ya tengo una cuenta' : 'Soy nuevo · Crear cuenta'}
      </button>}
    </section>
  );
};
