import type { VaultPermission } from '../supabase/types';

export function canWriteCredentials(vault?: { permissions: VaultPermission } | null) {
  return vault?.permissions === 'WRITE' || vault?.permissions === 'ADMIN';
}

export function canManageVault(vault?: { isOwner: boolean } | null) {
  return vault?.isOwner === true;
}

export function assertMutationSucceeded(result: { data: unknown; error: unknown }) {
  if (result.error) throw result.error;
  if (!result.data) {
    throw new Error('No se aplicó el cambio. El elemento ya no existe o tus permisos cambiaron. Recarga la bóveda y vuelve a intentarlo.');
  }
}

export function vaultErrorMessage(error: unknown, fallback = 'No se pudo completar la operación. Vuelve a intentarlo.') {
  const item = error as { code?: string; message?: string; name?: string } | null;
  const message = item?.message || '';
  if (/fetch|network|failed to load|timeout/i.test(message)) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.';
  }
  if (message.includes('Revoke shared access')) {
    return 'Esta bóveda todavía tiene otros miembros. No se puede convertir en privada hasta retirar sus accesos; esa función aún no está disponible.';
  }
  if (item?.code === '42501') return 'No tienes permiso para realizar esta operación. Recarga la bóveda para actualizar tu acceso.';
  if (item?.name === 'OperationError') return 'No se pudo desbloquear con esa contraseña maestra. Comprueba la contraseña y vuelve a intentarlo.';
  // App-authored errors provide actionable Spanish messages. Do not expose raw server errors.
  return error instanceof Error && /[áéíóúñ¿]|^(No |Esta |El |La |Error al |Contraseña )/.test(message)
    ? message : fallback;
}
