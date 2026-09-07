import React, { useId } from 'react';
import { FolderLock, Users } from 'lucide-react';

interface Props {
  name: string;
  type: 'PERSONAL' | 'SHARED';
  onName: (name: string) => void;
  onType: (type: 'PERSONAL' | 'SHARED') => void;
  disabled: boolean;
  creating?: boolean;
}

/** Shared fields keep create/edit terminology, accessible labels and privacy guidance consistent. */
export function VaultFormFields({ name, type, onName, onType, disabled, creating = false }: Props) {
  const id = useId();
  return <fieldset disabled={disabled} className="technical-fields">
    <div><label htmlFor={id}>Nombre de la bóveda</label>
      <input id={id} value={name} onChange={event => onName(event.target.value)} required
        placeholder="Ej. Casa, trabajo o familia" autoComplete="off" autoFocus className="technical-input" />
    </div>
    <fieldset><legend>Tipo de acceso</legend><div className="privacy-options">
      <label className="privacy-option" data-selected={type === 'PERSONAL'}>
        <input type="radio" name={`${id}-privacy`} checked={type === 'PERSONAL'} onChange={() => onType('PERSONAL')} />
        <FolderLock size={19} aria-hidden="true" /><strong>Privada</strong><span>Exclusiva para ti.</span>
      </label>
      <label className="privacy-option" data-selected={type === 'SHARED'}>
        <input type="radio" name={`${id}-privacy`} checked={type === 'SHARED'} onChange={() => onType('SHARED')} />
        <Users size={19} aria-hidden="true" /><strong>Familiar</strong><span>{creating
          ? 'Al crearla, solo tú tendrás acceso. Las invitaciones aún no están disponibles.'
          : 'Solo los miembros autorizados tienen acceso. Cambiar el tipo no añade miembros.'}</span>
      </label>
    </div></fieldset>
  </fieldset>;
}
