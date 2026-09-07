'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X, Shield } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Native modal supplies focus containment, background inertness and focus restoration. */
export function VaultDialog({ title, description, busy = false, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);

  return <dialog ref={ref} className="technical-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="technical-dialog-inner">
      <header className="technical-dialog-header">
        <div className="dialog-symbol" aria-hidden="true"><Shield size={22} /></div>
        <div><p className="technical-kicker">PONTORNO / BÓVEDAS</p><h2 id={titleId}>{title}</h2></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar ventana" className="card-icon-button"><X size={20} /></button>
      </header>
      <p id={descriptionId} className="technical-description">{description}</p>
      <div aria-busy={busy}>{children}</div>
    </div>
  </dialog>;
}
