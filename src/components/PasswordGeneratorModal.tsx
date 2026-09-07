'use client';

import React, { useState, useEffect } from 'react';
import { generateSecurePassword, generatePassphrase, estimatePasswordStrength } from '@/lib/security/generator';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { KeyRound, Copy, Check, RefreshCw, X, Sparkles } from 'lucide-react';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectPassword,
}) => {
  const [mode, setMode] = useState<'random' | 'passphrase'>('random');
  const [length, setLength] = useState(20);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [wordCount, setWordCount] = useState(4);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (mode === 'random') {
      const pwd = generateSecurePassword({
        length,
        includeUppercase: includeUpper,
        includeLowercase: includeLower,
        includeNumbers,
        includeSymbols,
      });
      setGeneratedPassword(pwd);
    } else {
      const phrase = generatePassphrase(wordCount, '-');
      setGeneratedPassword(phrase);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generate();
    }
  }, [isOpen, mode, length, includeUpper, includeLower, includeNumbers, includeSymbols, wordCount]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await copyToClipboardSecure(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = estimatePasswordStrength(generatedPassword);

  return (
    <div className="vault-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-7 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Generador de Contraseñas</h3>
              <p className="text-xs text-slate-400">Crea contraseñas únicas e imposibles de adivinar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 mb-5">
          <button
            onClick={() => setMode('random')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'random' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Contraseña
          </button>
          <button
            onClick={() => setMode('passphrase')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'passphrase' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Frase de Palabras
          </button>
        </div>

        {/* Output Display */}
        <div className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-2xl mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm sm:text-base text-indigo-300 break-all select-all font-semibold">
              {generatedPassword}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={generate}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                title="Regenerar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                title="Copiar al portapapeles"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Strength Bar */}
          <div className="mt-3 space-y-1">
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
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6 text-xs text-slate-300">
          {mode === 'random' ? (
            <>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Longitud:</span>
                  <span className="font-mono font-bold text-indigo-400">{length} caracteres</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeUpper}
                    onChange={(e) => setIncludeUpper(e.target.checked)}
                    className="rounded accent-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span>Mayúsculas (A-Z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeLower}
                    onChange={(e) => setIncludeLower(e.target.checked)}
                    className="rounded accent-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span>Minúsculas (a-z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeNumbers}
                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                    className="rounded accent-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span>Números (0-9)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSymbols}
                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                    className="rounded accent-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span>Símbolos (!@#$)</span>
                </label>
              </div>
            </>
          ) : (
            <div>
              <div className="flex justify-between mb-1">
                <span>Cantidad de palabras:</span>
                <span className="font-mono font-bold text-indigo-400">{wordCount} palabras</span>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cerrar
          </button>
          {onSelectPassword && (
            <button
              onClick={() => {
                onSelectPassword(generatedPassword);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/50 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Usar esta Contraseña</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
