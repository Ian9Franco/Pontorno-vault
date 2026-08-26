'use client';

import React, { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import { estimatePasswordStrength } from '@/lib/security/generator';

export const AuthModal: React.FC = () => {
  const { unifiedAuth } = useVault();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = estimatePasswordStrength(masterPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      if (!displayName.trim()) {
        setError('Por favor ingresa tu nombre o alias familiar (ej. Ian, Papá, Mamá).');
        return;
      }
      if (masterPassword.length < 8) {
        setError('La contraseña maestra debe tener al menos 8 caracteres.');
        return;
      }
      if (masterPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);
    try {
      await unifiedAuth({
        email: email.trim().toLowerCase(),
        masterPassword,
        displayName: displayName.trim(),
        isSignUp,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la autenticación';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-950/60 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {isSignUp ? 'Crear Cuenta Familiar' : 'Ingresar a Pontorno Vault'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSignUp
              ? 'Únete a la bóveda familiar con tu nombre y contraseña maestra'
              : 'Ingresa tu correo y contraseña maestra para abrir tu bóveda'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/40 text-rose-200 text-xs flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">Aviso:</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="tu-correo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
              required
              autoFocus
            />
          </div>

          {/* User Name / Alias (only on signup) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Tu Nombre o Alias Familiar
              </label>
              <input
                type="text"
                placeholder="Ej. Ian, Papá, Mamá, Sofía..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />
            </div>
          )}

          {/* Master Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Contraseña Maestra
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu clave para abrir tu bóveda..."
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-10 shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength when typing in register mode */}
            {isSignUp && masterPassword && (
              <div className="mt-1.5 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Nivel de seguridad:</span>
                  <span className="font-medium text-slate-200">{strength.label}</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password (only on signup) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Confirmar Contraseña Maestra
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña maestra..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition disabled:opacity-50 flex items-center justify-center gap-2 pt-2.5"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isSignUp ? 'Creando cuenta...' : 'Abriendo bóveda...'}</span>
              </div>
            ) : (
              <>
                <span>{isSignUp ? 'Crear Cuenta y Entrar' : 'Ingresar y Desbloquear'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-indigo-300 transition font-medium"
          >
            {isSignUp ? '¿Ya tienes una cuenta? Inicia sesión aquí' : '¿Nuevo miembro familiar? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};
