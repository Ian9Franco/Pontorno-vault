'use client';

import React from 'react';
import { LockKeyhole } from 'lucide-react';
import { motion, useReducedMotion, useTransform, useMotionValue } from 'motion/react';

interface VaultObjectProps {
  animated?: boolean;
  interactive?: boolean;
}

/** Six CSS planes form a real perspective volume, with no canvas or external assets.
 * Decorative only: it is not a control or a claim that the current session is locked.
 */
export function VaultObject({ animated = false, interactive = false }: VaultObjectProps) {
  const reduceMotion = useReducedMotion();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const rotateX = useTransform(dragY, [-60, 60], [14, -48]);
  const rotateY = useTransform(dragX, [-60, 60], [-66, 2]);
  const canInteract = interactive && !reduceMotion;

  const solid = canInteract ? (
    <motion.div
      className="vault-object-solid vault-object-draggable"
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.16}
      dragSnapToOrigin
      style={{ x: dragX, y: dragY, rotateX, rotateY }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
    >
      <VaultFaces />
    </motion.div>
  ) : (
    <div className="vault-object-solid"><VaultFaces /></div>
  );

  return <div className={`vault-object-scene ${animated && !canInteract ? 'vault-object-animated' : ''}`} aria-hidden="true">
    <div className="vault-object-shadow" />
    {solid}
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
