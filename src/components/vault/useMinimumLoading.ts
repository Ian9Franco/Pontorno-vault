'use client';

import { useEffect, useRef, useState } from 'react';

/** Holds the visual loading state without delaying the underlying operation. */
export function useMinimumLoading(loading: boolean, minimumMs = 2000) {
  const [holding, setHolding] = useState(loading);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      startedAt.current ??= performance.now();
      setHolding(true);
      return;
    }
    if (startedAt.current === null) return;
    const remaining = Math.max(0, minimumMs - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => {
      startedAt.current = null;
      setHolding(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [loading, minimumMs]);

  return loading || holding;
}
