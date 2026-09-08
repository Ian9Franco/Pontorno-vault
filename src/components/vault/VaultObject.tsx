'use client';

import React, { useEffect, useRef } from 'react';
import { LockKeyhole } from 'lucide-react';
import { motion, useReducedMotion, useSpring } from 'motion/react';

interface VaultObjectProps {
  animated?: boolean;
  interactive?: boolean;
}

/** Six CSS planes form a real perspective volume, with no canvas or external assets.
 * Decorative only: it is not a control or a claim that the current session is locked.
 */
export function VaultObject({ animated = false, interactive = false }: VaultObjectProps) {
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(-18, { stiffness: 120, damping: 20 });
  const rotateY = useSpring(-32, { stiffness: 120, damping: 20 });
  const canInteract = interactive && !reduceMotion;

  useEffect(() => {
    if (!canInteract) return;
    const reset = () => { rotateX.set(-18); rotateY.set(-32); };
    const follow = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const bounds = sceneRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      const x = clamp((event.clientX - bounds.left - bounds.width / 2) / Math.max(240, window.innerWidth / 2));
      const y = clamp((event.clientY - bounds.top - bounds.height / 2) / Math.max(240, window.innerHeight / 2));
      rotateX.set(-18 - y * 18);
      rotateY.set(-32 + x * 26);
    };
    const release = (event: PointerEvent) => { if (event.pointerType !== 'mouse') reset(); };
    window.addEventListener('pointermove', follow, { passive: true });
    window.addEventListener('pointerdown', follow, { passive: true });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', reset);
    window.addEventListener('blur', reset);
    document.documentElement.addEventListener('pointerleave', reset);
    return () => {
      window.removeEventListener('pointermove', follow);
      window.removeEventListener('pointerdown', follow);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
      document.documentElement.removeEventListener('pointerleave', reset);
    };
  }, [canInteract, rotateX, rotateY]);

  const solid = canInteract ? (
    <motion.div
      className="vault-object-solid"
      tabIndex={-1}
      style={{ rotateX, rotateY }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
    >
      <VaultFaces />
    </motion.div>
  ) : (
    <div className="vault-object-solid"><VaultFaces /></div>
  );

  return <div ref={sceneRef} className={`vault-object-scene ${animated || interactive ? 'vault-object-animated' : ''}`} aria-hidden="true">
    <div className="vault-object-shadow" />
    <div className="vault-object-float">{solid}</div>
  </div>;
}

/** Kept separate so static and gesture-driven shells share the same six planes. */
function VaultFaces() {
  return <>
    <div className="vault-object-face face-front"><div className="vault-object-door"><LockKeyhole size={24} /><i /><i /><span /></div></div>
    <div className="vault-object-face face-back" />
    <div className="vault-object-face face-left" />
    <div className="vault-object-face face-right"><i /><i /><i /></div>
    <div className="vault-object-face face-top" />
    <div className="vault-object-face face-bottom" />
  </>;
}
