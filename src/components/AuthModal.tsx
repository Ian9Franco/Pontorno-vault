'use client';

import React, { useState } from 'react';
import { VaultObject } from './vault/VaultObject';
import { AccessAction } from './vault/AccessAction';
import { useVault } from '@/context/VaultContext';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { supabase } from '@/lib/supabase/client';
import { TEST_MASTER_EMAIL, TEST_MASTER_PASSWORD } from '@/lib/constants/test-master';
import { Eye, EyeOff, ArrowRight, Monitor, LogIn, KeyRound } from 'lucide-react';

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

  const startSandbox = async () => {
    if (busy || isLoading) return;
    setBusy(true); setError(null);
    try { await unifiedAuth({ email: TEST_MASTER_EMAIL, masterPassword: TEST_MASTER_PASSWORD, isSignUp: false }); }
    catch (err) { setError(vaultErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const sandboxAccess = <div className="mt-4">
    <button type="button" className="technical-secondary w-full" disabled={busy || isLoading} onClick={startSandbox}>Probar interfaz · Sandbox</button>
    <p className="mt-2 text-xs text-slate-400">Cuenta pública de prueba. Usa solo datos ficticios; se guardan en este navegador.</p>
  </div>;

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
      <section className="auth-access" aria-labelledby="access-title">
      <div className="auth-panel">
        <div className="auth-panel-header auth-panel-header-compact">
        <div className="auth-heading">
          <p className="technical-kicker">Identidad separada del cifrado</p>
          <h2 id="access-title" >Entrar a Pontorno Vault</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Google confirma quién eres. Tu secreto de bóveda se pide después y no se usa como contraseña de Google ni de Supabase.
          </p>
        </div><VaultObject interactive /></div>

        {error && <p role="alert" className="technical-error">{error}</p>}

        <AccessAction type="button" disabled={busy || isLoading} onClick={startGoogle} className="technical-primary auth-submit">
          <LogIn className="h-5 w-5" aria-hidden="true" />
          {busy ? 'Redirigiendo…' : 'Continuar con Google'}
        </AccessAction>
        {sandboxAccess}

        <div className="mt-5 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm leading-relaxed text-slate-300">
          <div className="mb-1 flex items-center gap-2 font-medium text-emerald-200"><KeyRound className="h-4 w-4" /> Dos barreras distintas</div>
          <p className="text-slate-400">Robar la sesión de Google/Supabase no debería revelar el contenido de la bóveda sin el secreto criptográfico local.</p>
        </div>

        <button type="button" onClick={() => { setShowLegacy(!showLegacy); setError(null); }} className="auth-mode-toggle">
          {showLegacy ? 'Ocultar acceso legado' : 'Tengo una cuenta anterior · Acceso legado'}
        </button>

        {showLegacy && (
          <form onSubmit={submitLocalOrLegacy} className="auth-form mt-4 border border-amber-900/40 p-4" aria-busy={busy}>
            <p className="text-xs leading-relaxed text-amber-200">Solo para cuentas creadas antes de separar Auth y Crypto. Entra una vez, desbloquea tu bóveda y vincula Google desde Configuración.</p>
            <div>
              <label htmlFor="legacy-email" className="mb-2 block text-sm font-medium text-slate-200">Correo electrónico</label>
              <input id="legacy-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required className="technical-input" />
            </div>
            <div>
              <label htmlFor="legacy-password" className="mb-2 block text-sm font-medium text-slate-200">Contraseña maestra anterior</label>
              <div className="relative">
                <input id="legacy-password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="technical-input auth-input-with-action" />
                <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="auth-visibility-button">
                  {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <AccessAction type="submit" disabled={busy || isLoading} className="technical-primary auth-submit">Migrar acceso <ArrowRight className="h-5 w-5" /></AccessAction>
          </form>
        )}
      </div>
    </section>
    );
  }

  return (
    <section className="auth-access" aria-labelledby="local-access-title">
      <div className="auth-panel">
      <div className="auth-panel-header auth-panel-header-compact">
        <div className="auth-heading">
        <p className="technical-kicker">Demo local</p>
        <h2 id="local-access-title" >{creatingLocal ? 'Tu primera bóveda' : 'Bienvenido de nuevo'}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-400">{creatingLocal ? 'Crea una frase maestra que solo exista en este navegador.' : 'Introduce tu frase maestra para abrir la bóveda local.'}</p>
      </div><VaultObject interactive /></div>

      <div className="mb-6 flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden="true" />
        <div><p className="font-medium">Solo en este navegador</p><p className="mt-1 text-slate-400">No se sincroniza; si borras los datos del navegador, pierdes esta copia.</p></div>
      </div>

      {error && <p role="alert" className="technical-error">{error}</p>}
      <form onSubmit={submitLocalOrLegacy} className="auth-form" aria-busy={busy}>
        <div>
          <label htmlFor="local-password" className="mb-2 block text-sm font-medium text-slate-200">{creatingLocal ? 'Elige tu frase maestra' : 'Frase maestra'}</label>
          <div className="relative">
            <input id="local-password" type={visible ? 'text' : 'password'} autoComplete={creatingLocal ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={creatingLocal ? 12 : undefined} className="technical-input auth-input-with-action" />
            <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} className="auth-visibility-button">
              {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {creatingLocal && <div><label htmlFor="local-confirm" className="mb-2 block text-sm font-medium text-slate-200">Repite la frase maestra</label><input id="local-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required className="technical-input" /></div>}
        <AccessAction type="submit" disabled={busy || isLoading} className="technical-primary auth-submit">{creatingLocal ? 'Crear mi bóveda' : 'Abrir mi bóveda'} <ArrowRight className="h-5 w-5" /></AccessAction>
      </form>
      {sandboxAccess}
    </div>
    </section>
  );
};
