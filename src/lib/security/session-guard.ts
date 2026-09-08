/** All async secret-bearing work captures a ticket before its first await. */
export function createSessionGuard() {
  let generation = 0;
  return {
    capture: () => generation,
    invalidate: () => { generation += 1; },
    current: (ticket: number) => ticket === generation,
    assert: (ticket: number) => {
      if (ticket !== generation) throw new Error('La sesión cambió. Vuelve a desbloquear la bóveda.');
    },
  };
}
