'use client';

import React from 'react';
import { X, Mail, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';
import { copyToClipboardSecure } from '@/lib/security/clipboard';

interface EmailForwardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailForwardingGuideModal: React.FC<EmailForwardingGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/email-otp` : '/api/webhooks/email-otp';

  if (!isOpen) return null;

  const handleCopy = async () => {
    await copyToClipboardSecure(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reenvío Automático de Códigos Familiares</h3>
              <p className="text-xs text-gray-400">Evita que te pidan los códigos de Disney, Netflix o Prime</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-gray-300">
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Configura una regla en tu correo para que solo los emails con <strong>códigos de acceso</strong> se reenvíen automáticamente a Family Vault. Tus correos privados nunca se tocan.
            </span>
          </div>

          {/* Webhook URL Box */}
          <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl space-y-1.5">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
              Tu Endpoint Webhook de Family Vault
            </span>
            <div className="flex items-center justify-between gap-2 bg-gray-900 p-2 rounded-lg border border-gray-800">
              <code className="font-mono text-xs text-emerald-400 break-all">{webhookUrl}</code>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-white text-sm">Pasos para Gmail:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-400 pl-1">
              <li>Abre <strong>Gmail</strong> y ve a <strong>Configuración (⚙️) &gt; Ver todos los ajustes</strong>.</li>
              <li>Entra a la pestaña <strong>Filtros y direcciones bloqueadas &gt; Crear un filtro nuevo</strong>.</li>
              <li>
                En <strong>De</strong> escribe: <code className="text-gray-200 bg-gray-950 px-1 py-0.5 rounded">disneyplus.com OR netflix.com OR primevideo.com</code>
              </li>
              <li>
                En <strong>Contiene las palabras</strong> escribe: <code className="text-gray-200 bg-gray-950 px-1 py-0.5 rounded">código OR code OR acceso</code>
              </li>
              <li>Haz clic en <strong>Crear filtro</strong> y selecciona <strong>Reenviar a tu webhook o casilla</strong>.</li>
            </ol>
          </div>
        </div>

        <div className="pt-5 mt-5 border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
