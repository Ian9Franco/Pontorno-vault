import React from 'react';
import { LockKeyhole } from 'lucide-react';

/** Six CSS planes form a real perspective volume, with no canvas or external assets.
 * Decorative only: it is not a control or a claim that the current session is locked.
 */
export function VaultObject({ animated = false }: { animated?: boolean }) {
  return <div className={`vault-object-scene ${animated ? 'vault-object-animated' : ''}`} aria-hidden="true">
    <div className="vault-object-shadow" />
    <div className="vault-object-solid">
      <div className="vault-object-face face-front"><div className="vault-object-door"><LockKeyhole size={24} /><i /><i /><span /></div></div>
      <div className="vault-object-face face-back" />
      <div className="vault-object-face face-left" />
      <div className="vault-object-face face-right"><i /><i /><i /></div>
      <div className="vault-object-face face-top" />
      <div className="vault-object-face face-bottom" />
    </div>
  </div>;
}
