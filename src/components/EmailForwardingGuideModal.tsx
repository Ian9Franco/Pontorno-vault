'use client';

import React, { useState } from 'react';
import { Mail, Copy, Check, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { copyToClipboardSecure } from '@/lib/security/clipboard';

interface EmailForwardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailForwardingGuideModal: React.FC<EmailForwardingGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/email-otp`
    : 'https://pontorno-vault.vercel.app/api/webhooks/email-otp';

  if (!isOpen) return null;

  const handleCopyWebhook = async () => {
    await copyToClipboardSecure(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="vault-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-lg bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-7 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Reenvío Automático de Códigos OTP</h3>
              <p className="text-xs text-slate-400">Disney+, Netflix y plataformas de streaming</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <p className="text-slate-300 leading-relaxed">
            Cuando un miembro de la familia inicia sesión en <strong>Disney+</strong> o <strong>Netflix</strong> y la plataforma envía un código de verificación al correo del titular, este sistema lo detecta y lo muestra en tiempo real en la barra de la app sin que nadie tenga que pedirlo por WhatsApp.
          </p>

          {/* Webhook endpoint box */}
          <div className="p-3.5 bg-slate-950/90 border border-slate-800/80 rounded-2xl space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Dirección de Reenvío o Webhook:
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-indigo-300 truncate">
                {webhookUrl}
              </span>
              <button
                onClick={handleCopyWebhook}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-100 text-xs">Pasos para configurar en Gmail o Outlook:</h4>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Crear una regla o filtro en tu correo</p>
                  <p className="text-[11px] text-slate-400">
                    Filtra correos que contengan en el remitente: <code>disneyplus.com</code>, <code>netflix.com</code> o <code>amazon.com</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Reenviar automáticamente</p>
                  <p className="text-[11px] text-slate-400">
                    Configura la acción para reenviar el correo a la dirección de webhook configurada en tu servidor.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Listo</p>
                  <p className="text-[11px] text-slate-400">
                    Cada vez que llegue un código, cualquier miembro de la familia que tenga abierta la app lo verá al instante con 1 clic para copiar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
