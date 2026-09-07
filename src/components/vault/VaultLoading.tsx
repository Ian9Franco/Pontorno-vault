'use client';

import React from 'react';
import { motion } from 'motion/react';
import { VaultObject } from './VaultObject';

/** Structural placeholders contain no real vault names, credentials or fake progress. */
export function VaultSkeleton() {
  return <div className="vault-skeleton" aria-hidden="true">
    <div className="skeleton-vaults">{[0, 1].map(id => <div key={id} className="skeleton-panel"><i /><i /></div>)}</div>
    <div className="skeleton-search" />
    <div className="skeleton-services">{Array.from({ length: 6 }, (_, id) => <div key={id} className="skeleton-panel"><i /><i /><i /></div>)}</div>
  </div>;
}

/** Driven exclusively by real initialization/unlock work, never by an artificial timer. */
export function VaultLoading({ unlocking = false, overlay = false }: { unlocking?: boolean; overlay?: boolean }) {
  return <motion.div
    className={`vault-loading ${overlay ? 'vault-loading-overlay' : ''}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 1.015 }}
    transition={{ duration: 0.22, ease: 'easeOut' }}
  >
    <div className="preload-console" role="status" aria-live="polite">
      <p className="technical-kicker">PONTORNO VAULT</p>
      <VaultObject animated />
      <h2>{unlocking ? 'Abriendo tu bóveda' : 'Preparando tu espacio'}</h2>
      <p>{unlocking ? 'Descifrando tus datos en este dispositivo.' : 'Comprobando la configuración de acceso.'}</p>
      <div className="preload-track" aria-hidden="true" />
      <span className="preload-caption">{unlocking ? 'ACCESO EN CURSO' : 'INICIANDO'}</span>
    </div>
    <VaultSkeleton />
  </motion.div>;
}
