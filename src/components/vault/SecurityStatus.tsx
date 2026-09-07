import React from 'react';
import { ShieldCheck, Timer, Monitor, Cloud } from 'lucide-react';

/** Describes implemented protections. No invented scores, scans or security guarantees. */
export function SecurityStatus({ local, autoLockMinutes }: { local: boolean; autoLockMinutes: number }) {
  return <div className="security-status" aria-label="Protección de tu bóveda">
    <span><ShieldCheck size={16} aria-hidden="true" /> Datos cifrados</span>
    <span><Timer size={16} aria-hidden="true" /> Bloqueo por inactividad · {autoLockMinutes} min</span>
    <span>{local ? <Monitor size={16} aria-hidden="true" /> : <Cloud size={16} aria-hidden="true" />}
      {local ? 'Solo en este navegador' : 'Cuenta conectada'}</span>
  </div>;
}
