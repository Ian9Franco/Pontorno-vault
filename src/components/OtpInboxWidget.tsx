'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { PlatformIcon } from './PlatformIcon';
import {
  Bell,
  Copy,
  Check,
  Clock,
  Trash2,
  Sparkles,
  Mail,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export interface VerificationCodeItem {
  id: string;
  service_name: string;
  sender_email?: string;
  subject?: string;
  code: string;
  snippet?: string;
  expires_at: string;
  created_at: string;
}

interface OtpInboxWidgetProps {
  onOpenGuide: () => void;
}

const LOCAL_CODES_KEY = 'family_vault_demo_otp_codes';

export const OtpInboxWidget: React.FC<OtpInboxWidgetProps> = ({ onOpenGuide }) => {
  const [codes, setCodes] = useState<VerificationCodeItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchCodes = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('verification_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data) {
        setCodes(data);
      }
    } else {
      const raw = localStorage.getItem(LOCAL_CODES_KEY);
      if (raw) {
        setCodes(JSON.parse(raw));
      }
    }
  }, []);

  useEffect(() => {
    fetchCodes();
    const interval = setInterval(fetchCodes, 8000); // Polling every 8s for incoming codes
    return () => clearInterval(interval);
  }, [fetchCodes]);

  const handleCopy = async (code: string, id: string) => {
    await copyToClipboardSecure(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('verification_codes').delete().eq('id', id);
    } else {
      const updated = codes.filter((c) => c.id !== id);
      localStorage.setItem(LOCAL_CODES_KEY, JSON.stringify(updated));
    }
    setCodes((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSimulateTest = async (service: 'Disney+' | 'Netflix' | 'Amazon Prime') => {
    setIsSimulating(true);
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60000).toISOString();

    const newCode: VerificationCodeItem = {
      id: 'otp-' + Date.now(),
      service_name: service,
      sender_email: service === 'Disney+' ? 'account@disneyplus.com' : 'info@netflix.com',
      subject: `Tu código de acceso único para ${service}`,
      code: randomOtp,
      snippet: `Tu código de verificación de 6 dígitos es: ${randomOtp}. Válido durante 15 minutos.`,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('verification_codes').insert(newCode);
    } else {
      const updated = [newCode, ...codes];
      localStorage.setItem(LOCAL_CODES_KEY, JSON.stringify(updated));
    }
    setCodes((prev) => [newCode, ...prev]);
    setIsSimulating(false);
  };

  if (codes.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>Inbox Familiar de Códigos OTP (Disney / Netflix)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSimulateTest('Disney+')}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
              title="Simular llegada de código de Disney+"
            >
              + Probar Código Disney
            </button>
            <button
              onClick={onOpenGuide}
              className="p-1 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-gray-800 transition"
              title="Configurar reenvío de correo"
            >
              <Mail className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg shadow-emerald-950/20 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <Bell className="w-4 h-4 animate-bounce" />
          <span>Códigos de Verificación Recibidos ({codes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSimulateTest('Netflix')}
            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
          >
            + Simular Netflix
          </button>
          <button
            onClick={onOpenGuide}
            className="p-1 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-gray-800 transition"
            title="Cómo funciona el reenvío"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {codes.map((item) => {
          const isCopied = copiedId === item.id;
          const isLink = item.code.startsWith('http');

          return (
            <div
              key={item.id}
              className="p-3 bg-gray-950 border border-emerald-900/60 rounded-xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PlatformIcon platformName={item.service_name} size="sm" />
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold text-white truncate">{item.service_name}</h5>
                  {isLink ? (
                    <a
                      href={item.code}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Validar Hogar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                      {item.code}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 block truncate">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(item.code, item.id)}
                  className="p-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition"
                  title="Copiar código OTP"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-gray-900 transition"
                  title="Descartar código"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
