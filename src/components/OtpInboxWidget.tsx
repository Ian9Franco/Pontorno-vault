'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { copyToClipboardSecure } from '@/lib/security/clipboard';
import { PlatformIcon } from './PlatformIcon';
import {
  Bell,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Inbox,
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

const LOCAL_CODES_KEY = 'family_vault_demo_otp_codes';

export const OtpInboxWidget: React.FC = () => {
  const [codes, setCodes] = useState<VerificationCodeItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    if (isSupabaseConfigured) return;
    fetchCodes();
    const interval = setInterval(fetchCodes, 8000);
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
    if (isSupabaseConfigured) return;
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60000).toISOString();

    const newCode: VerificationCodeItem = {
      id: 'otp-' + Date.now(),
      service_name: service,
      sender_email: service === 'Disney+' ? 'account@disneyplus.com' : 'info@netflix.com',
      subject: `Tu código de acceso único para ${service}`,
      code: randomOtp,
      snippet: `Tu código de verificación es: ${randomOtp}.`,
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
  };

  if (isSupabaseConfigured) {
    return <div role="status" className="rounded-2xl border border-slate-800 p-4 text-sm text-slate-400">
      El inbox de códigos está temporalmente deshabilitado.
    </div>;
  }

  if (codes.length === 0) {
    return (
      <div className="bg-[#111624] border border-slate-800/80 rounded-2xl p-3.5 transition shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Inbox className="w-4 h-4 text-indigo-400" />
            <span>Códigos simulados — demo local</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateTest('Disney+')}
              className="px-2.5 py-1 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70 transition shadow-sm"
              title="Simular llegada de código de Disney+"
            >
              + Probar Código
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111624] border border-indigo-500/30 rounded-2xl p-4 shadow-md shadow-indigo-950/20 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
          <Bell className="w-4 h-4 animate-bounce text-indigo-400" />
          <span>Códigos simulados ({codes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSimulateTest('Netflix')}
            className="px-2.5 py-1 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70 transition shadow-sm"
          >
            + Simular Netflix
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
              className="p-3 bg-slate-950/90 border border-indigo-900/40 rounded-xl flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PlatformIcon platformName={item.service_name} size="sm" />
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold text-slate-100 truncate">{item.service_name}</h5>
                  {isLink ? (
                    <a
                      href={item.code}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Validar Acceso</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-base font-bold text-indigo-300 tracking-wider">
                      {item.code}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 block truncate">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(item.code, item.id)}
                  className="p-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 transition shadow-sm"
                  title="Copiar código"
                >
                  {isCopied ? <Check className="w-4 h-4 text-indigo-300" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
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
