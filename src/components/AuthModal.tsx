'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { supabase } from '@/lib/supabase/client';
import { Shield, Eye, EyeOff, ArrowRight, Monitor, LogIn, KeyRound } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { unifiedAuth, isSupabaseConnected, isConfigured, isLoading } = useVault();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = !isSupabaseConnected;
  const creatingLocal = local && !isConfigured;

  const startGoogle = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(vaultErrorMessage(err));
      setBusy(false);
    }
  };

  const submitLocalOrLegacy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || isLoading) return;
    setError(null);

    if (creatingLocal && password.length < 12) {
      setError('Usa una frase maestra de al menos 12 caracteres.');
      return;
    }
    if (creatingLocal && password !== confirmation) {
      setError('Las frases maestras no coinciden. Escríbelas de nuevo.');
      return;
    }

    setBusy(true);
    try {
      await unifiedAuth({
        email: local ? '' : email.trim().toLowerCase(),
        masterPassword: password,
        displayName: local ? 'Yo' : email.split('@')[0],
        // Password auth remains only as a migration path for existing synced accounts.
        isSignUp: local ? creatingLocal : false,
      });
    } catch (err) {
      setError(vaultErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!local) {
    return (
      <section className="mx-auto w-full max-w-md px-5 py-8 sm:py-14" aria-labelledby="access-title">
        <div className="mb-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Shield aria-hidden="true" /></div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Identidad separada del cifrado</p>
          <h2 id="access-title" className="text-3xl font-semibold tracking-tight text-slate-100">Entrar a Pontorno Vault</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Google confirma quién eres. Tu secreto de bóveda se pide después y no se usa como contraseña de Google ni de Supabase.
          </p>
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-800/50 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}

        <button type="button" disabled={busy || isLoading} onClick={startGoogle} className="vault-primary w-full">
          <LogIn className="h-5 w-5" aria-hidden="true" />
          {busy ? 'Redirigiendo…' : 'Continuar con Google'}
        </button>

        <div className="mt-5 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm leading-relaxed text-slate-300">
          <div className="mb-1 flex items-center gap-2 font-medium text-emerald-200"><KeyRound className="h-4 w-4" /> Dos barreras distintas</div>
          <p className="text-slate-400">Robar la sesión de Google/Supabase no debería revelar el contenido de la bóveda sin el secreto criptográfico local.</p>
        </div>

        <button type="button" onClick={() => { setShowLegacy(!showLegacy); setError(null); }} className="mt-5 min-h-12 w-full rounded-xl px-3 text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-200">
          {showLegacy ? 'Ocultar acceso legado' : 'Tengo una cuenta anterior · Acceso legado'}
        </button>

        {showLegacy && (
          <form onSubmit={submitLocalOrLegacy} className="mt-4 space-y-4 rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4" aria-busy={busy}>
            <p className="text-xs leading-relaxed text-amber-200">Solo para cuentas creadas antes de separar Auth y Crypto. Entra una vez, desbloquea tu bóveda y vincula Google desde Configuración.</p>
            <div>
              <label htmlFor="legacy-email" className="mb-2 block text-sm font-medium text-slate-200">Correo electrónico</label>
              <input id="legacy-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required className="vault-input" />
            </div>
            <div>
              <label htmlFor="legacy-password" className="mb-2 block text-sm font-medium text-slate-200">Contraseña maestra anterior</label>
              <div className="relative">
                <input id="legacy-password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="vault-input pr-14" />
                <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-white">
                  {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy || isLoading} className="vault-primary w-full">Migrar acceso <ArrowRight className="h-5 w-5" /></button>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md px-5 py-8 sm:py-14" aria-labelledby="local-access-title">
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Shield aria-hidden="true" /></div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Demo local</p>
        <h2 id="local-access-title" className="text-3xl font-semibold tracking-tight text-slate-100">{creatingLocal ? 'Tu primera bóveda' : 'Bienvenido de nuevo'}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-400">{creatingLocal ? 'Crea una frase maestra que solo exista en este navegador.' : 'Introduce tu frase maestra para abrir la bóveda local.'}</p>
      </div>

      <div className="mb-6 flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
        <div><p className="font-medium">Solo en este navegador</p><p className="mt-1 text-slate-400">No se sincroniza; si borras los datos del navegador, pierdes esta copia.</p></div>
      </div>

      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-800/50 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
      <form onSubmit={submitLocalOrLegacy} className="space-y-5" aria-busy={busy}>
        <div>
          <label htmlFor="local-password" className="mb-2 block text-sm font-medium text-slate-200">{creatingLocal ? 'Elige tu frase maestra' : 'Frase maestra'}</label>
          <input id="local-password" type={visible ? 'text' : 'password'} autoComplete={creatingLocal ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={creatingLocal ? 12 : undefined} className="vault-input" />
        </div>
        {creatingLocal && <div><label htmlFor="local-confirm" className="mb-2 block text-sm font-medium text-slate-200">Repite la frase maestra</label><input id="local-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required className="vault-input" /></div>}
        <button type="submit" disabled={busy || isLoading} className="vault-primary w-full">{creatingLocal ? 'Crear mi bóveda' : 'Abrir mi bóveda'} <ArrowRight className="h-5 w-5" /></button>
      </form>
    </section>
  );
};
