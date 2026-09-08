/** Applies only when choosing a NEW secret; existing passwords remain unlockable. */
export function assertNewMasterPassword(password: string) {
  const length = Array.from(password).length;
  const normalized = password.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (length < 12 || length > 256) throw new Error('Usa una frase maestra de entre 12 y 256 caracteres.');
  if (/^(.)\1+$/.test(password) || /^\d+$/.test(normalized) || /^(password|contrase[nñ]a|qwerty|1234567890|admin|letmein|welcome|iloveyou)[0-9!@#$]*$/i.test(normalized)) {
    throw new Error('Esa frase es demasiado común. Usa varias palabras impredecibles que no uses en otra cuenta.');
  }
}

export function hasGoogleIdentity(user: { app_metadata?: { providers?: unknown }; identities?: Array<{ provider: string }> } | null) {
  return Boolean(user?.identities?.some(identity => identity.provider === 'google') ||
    (Array.isArray(user?.app_metadata?.providers) && user.app_metadata.providers.includes('google')));
}
