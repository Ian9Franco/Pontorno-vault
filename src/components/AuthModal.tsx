'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { vaultErrorMessage } from '@/lib/security/vault-access';
import { Shield, Eye, EyeOff, ArrowRight, Monitor, LockKeyhole, CheckCircle2 } from 'lucide-react';
import { VaultObject } from '@/components/vault/VaultObject';
import { motion, useReducedMotion } from 'motion/react';

export const AuthModal: React.FC = () => {
  const reduceMotion = useReducedMotion();
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
    <section className="auth-access" aria-labelledby="access-title">
      <div className="auth-panel">
        <div className="auth-panel-header">
          <div className="auth-brand-mark"><Shield aria-hidden="true" /></div>
          <div className="auth-heading">
            <p className="technical-kicker">PONTORNO VAULT · {local ? 'LOCAL' : 'SECURE CLOUD'}</p>
            <h2 id="access-title">{title}</h2>
            <p>{creating
              ? 'Una sola contraseña para proteger las demás. Elígela tú y guárdala en un lugar seguro.'
              : 'Introduce tu contraseña maestra para abrir tus contraseñas.'}</p>
          </div>
          <VaultObject interactive />
        </div>

        <div className="auth-status-row" aria-label="Estado de seguridad">
          <span><CheckCircle2 aria-hidden="true" /> Cifrado local</span>
          <span><LockKeyhole aria-hidden="true" /> Acceso privado</span>
        </div>

        {local && <div className="auth-notice">
          <Monitor aria-hidden="true" />
          <div><p>Solo en este navegador</p><span>{creating
            ? 'Todavía no hay una bóveda aquí. Puedes crearla sin correo ni cuenta.'
            : 'Tu bóveda está guardada aquí. No necesitas un correo para abrirla.'} No se sincroniza; si borras los datos del navegador, la perderás.</span></div>
        </div>}

        {error && <p role="alert" className="technical-error">{error}</p>}
        <form onSubmit={submit} className="auth-form" aria-busy={busy}>
        {!local && <div>
          <label htmlFor="access-email">Correo electrónico</label>
          <input id="access-email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
            value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" required className="technical-input" />
        </div>}
        <div>
          <label htmlFor="access-password">{creating ? 'Elige tu contraseña maestra' : 'Contraseña maestra'}</label>
          <div className="relative">
            <input id="access-password" type={visible ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'}
              value={password} onChange={e => setPassword(e.target.value)} required minLength={creating ? 8 : undefined}
              aria-describedby={creating ? 'password-guidance' : undefined} className="technical-input auth-input-with-action" />
            <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}
              className="auth-visibility-button">
              {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {creating && <p id="password-guidance" className="technical-hint">Usa una frase larga que recuerdes. No podremos recuperarla por ti.</p>}
        </div>
        {creating && <div>
          <label htmlFor="access-confirm">Repite la contraseña</label>
          <input id="access-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation}
            onChange={e => setConfirmation(e.target.value)} required className="technical-input" />
        </div>}
        <motion.button type="submit" disabled={busy || isLoading} className="technical-primary auth-submit"
          whileHover={reduceMotion ? undefined : { y: -2, boxShadow: '0 9px 24px rgba(0, 0, 0, .32)' }}
          whileTap={reduceMotion ? undefined : { y: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}>
          {busy ? 'Un momento…' : isLoading ? 'Comprobando este navegador…' : creating ? (local ? 'Crear mi bóveda' : 'Crear cuenta') : 'Abrir mi bóveda'}
          {!busy && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </motion.button>
        </form>
        {!local && <button type="button" disabled={busy} onClick={() => { setCreateAccount(!createAccount); setError(null); setConfirmation(''); }}
          className="auth-mode-toggle">
        {creating ? 'Ya tengo una cuenta' : 'Soy nuevo · Crear cuenta'}
        </button>}
      </div>
    </section>
  );
};
