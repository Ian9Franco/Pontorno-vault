'use client';

import React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

/** Shared visual feedback; authentication remains owned by the calling form. */
export function AccessAction(props: HTMLMotionProps<'button'>) {
  const reduced = useReducedMotion();
  return <motion.button
    whileHover={reduced ? undefined : { y: -2 }}
    whileTap={reduced ? undefined : { y: 0, scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    {...props}
  />;
}
