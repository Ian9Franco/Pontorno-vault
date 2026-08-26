'use client';

import React, { useState, useEffect } from 'react';
import { generateSecurePassword, generatePassphrase, estimatePasswordStrength } from '@/lib/security/generator';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { KeyRound, Copy, Check, RefreshCw, X, Shield } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Generador Criptográfico</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 mb-5">
          <button
            onClick={() => setMode('random')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'random' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Contraseña
          </button>
          <button
            onClick={() => setMode('passphrase')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'passphrase' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Passphrase
          </button>
        </div>

        {/* Output Display */}
        <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm sm:text-base text-emerald-400 break-all select-all font-medium">
              {generatedPassword}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={generate}
                title="Generar nueva"
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                title="Copiar contraseña"
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Strength Bar */}
          <div className="mt-3 space-y-1">
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all duration-300`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Options */}
        {mode === 'random' ? (
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Longitud:</span>
                <span className="font-bold text-white">{length} caracteres</span>
              </div>
              <input
                type="range"
                min="8"
                max="64"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-950 border border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUpper}
                  onChange={(e) => setIncludeUpper(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-gray-300">Mayúsculas (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-950 border border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLower}
                  onChange={(e) => setIncludeLower(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-gray-300">Minúsculas (a-z)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-950 border border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-gray-300">Números (0-9)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-950 border border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-gray-300">Símbolos (!@#$)</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Cantidad de palabras:</span>
                <span className="font-bold text-white">{wordCount}</span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {onSelectPassword && (
            <button
              onClick={() => {
                onSelectPassword(generatedPassword);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Usar Contraseña
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold border border-gray-700 transition flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiada' : 'Copiar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
