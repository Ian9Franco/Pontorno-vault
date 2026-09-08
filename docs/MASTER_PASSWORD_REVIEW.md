# Revisión de contraseña maestra — 7 de septiembre de 2026

Alcance: revisión del código local, flujos de alta/desbloqueo/rotación/bloqueo,
criptografía y pruebas existentes. No se solicitó ni analizó la contraseña real del
usuario. No es un pentest de producción ni una certificación. El documento
`supabase/PRODUCTION_SECURITY_STATUS.md` describe comprobaciones previas; no se
repitieron contra producción en esta revisión.

## Resultado

La base criptográfica es razonable, pero hay riesgos de sesión y del acceso legado
que impiden afirmar que la contraseña maestra esté protegida en todos los flujos.
Las observaciones siguientes quedan pendientes de corrección; este cambio implementa
la interfaz y documenta la auditoría, sin migrar cuentas ni cambiar sus secretos.

### Controles encontrados

- Argon2id con 64 MiB, 3 iteraciones, 4 vías y salida de 32 bytes; salt aleatorio de
  16 bytes por alta/rotación (`src/lib/crypto/argon.ts`). OWASP recomienda Argon2id
  y publica perfiles mínimos; el perfil actual no parece débil por sus parámetros.
  Debe medirse su coste en móviles reales antes de cambiarlo.
- AES-256-GCM con nonce aleatorio de 12 bytes y tag de 128 bits; credenciales v2
  autenticadas con AAD. Contraseña incorrecta y alteraciones del cifrado fallan.
- La contraseña deriva una KEK que envuelve una clave de usuario aleatoria;
  esta envuelve las claves de bóveda. La rotación no requiere recifrar cada contraseña.
- Claves de ejecución no exportables y referencias eliminadas al bloquear; las
  credenciales descifradas se retiran del estado. JavaScript no garantiza borrado físico de RAM.
- Google autentica la identidad y luego se pide un secreto de bóveda independiente.
- Tests locales de cifrado, permisos, persistencia y RLS; 61 pruebas pasaron en esta revisión.

## Hallazgos y tratamiento propuesto

| Prioridad | Evidencia local | Riesgo y corrección |
| --- | --- | --- |
| Alta | `createAuthActions.ts`: `signInWithPassword` y rama `signUp` reciben `masterPassword` | El secreto legado cruza el límite de red de Auth. Migrar la misma identidad a Google, comprobar acceso y rotar a una frase distinta. Eliminar el alta password del comando, además de ocultarla en UI. Retirar el login legado solo después de inventariar y migrar cuentas. |
| Alta | `useVaultDecryption.ts` publica claves, credenciales y `setIsUnlocked(true)` al terminar los `await`; `useVaultSession.ts:lock` no invalida operaciones pendientes | Una operación iniciada antes de cerrar sesión/bloquear puede terminar después y volver a publicar datos. Hallazgo de flujo de código; falta reproducción concurrente. Introducir una generación de sesión, invalidarla al bloquear/cambiar usuario y comprobarla antes de cada publicación. Probar logout durante consultas lentas y Argon2. |
| Media | `AuthModal.tsx`, `UnlockModal.tsx`, `SettingsModal.tsx` exigen 12 caracteres; `setupUserCrypto` y `rotateMasterPassword` no aplican esa política | Otro llamador puede crear o rotar a un secreto débil. Centralizar la política para secretos nuevos, rechazar contraseñas comunes y ofrecer una frase larga. No aplicar retroactivamente el mínimo al desbloqueo de cuentas existentes. Longitud sola no demuestra fortaleza. |
| Media | `deriveKEKBytes` usa `kdfParameters` persistidos directamente | Parámetros corruptos pueden bloquear el navegador con consumo excesivo de memoria/CPU. Validar tipos, enteros, algoritmo, versión, salt y cotas antes de ejecutar WASM, con compatibilidad explícita para registros existentes. Modificar parámetros no permite descifrar un registro ya cifrado: el riesgo inmediato es disponibilidad. |
| Media | `deriveKEK` conserva el `Uint8Array` derivado hasta que el recolector lo libere | Limpiar el buffer en `finally` después de `importKey`, también si falla; es mitigación de exposición temporal, no garantía de borrado de la contraseña o copias internas de WASM. |
| Media | `next.config.ts` tiene headers defensivos pero no CSP | Una inyección o dependencia comprometida puede capturar el secreto o usar claves no exportables mientras la bóveda está abierta. Implementar CSP compatible con Next y WASM, probar en report-only y luego exigirla; proteger despliegues y minimizar scripts externos. CSP no neutraliza un servidor que distribuye JavaScript malicioso. |
| Media | `vault.ts` usa AAD constante `pontorno-vault:credential:v2`; wrappers sin contexto de entidad | Un actor con escritura de base puede intercambiar ciphertexts válidos dentro del mismo contexto criptográfico sin romper GCM. Versionar AAD con usuario/bóveda/credencial y propósito; migrar de forma compatible y probar sustitución entre registros. |

La restricción de rotación para cuentas legadas está en `SettingsModal`, pero no
en `changeMasterPassword`: trasladar la regla al comando para evitar divergencia
entre contraseña Auth y secreto de cifrado en otros llamadores.

No hay backoff propio en el desbloqueo local. Puede añadirse para intentos interactivos,
pero se evade modificando el cliente y no frena ataques offline contra ciphertexts
robados. Las defensas fundamentales son Argon2id y una frase maestra impredecible.

## Orden de trabajo y pruebas

1. Invalidación de operaciones pendientes y cambios de identidad. Tests con promesas
   diferidas: bloquear/cerrar sesión antes de resolver y verificar que no reaparezcan claves.
2. Política de nuevos secretos y validación de parámetros. Probar frases débiles,
   Unicode, contraseñas antiguas válidas y registros corruptos antes de llamar WASM.
3. Migración completa del legado, preservando ID, membresías y datos. En staging:
   Google → abrir → rotar → cerrar sesión → abrir con nuevo secreto; el anterior falla.
4. Borrado de buffers, CSP y AAD contextual con pruebas de compatibilidad.
5. Verificación remota con dos identidades reales, JWT caducado y revocación de acceso.

La suite actual pasa, pero no cubre por sí sola la carrera de sesión ni demuestra
que CSP, MFA, protección de contraseñas filtradas o políticas remotas estén activas.

## Fuentes

- [OWASP: almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [Supabase: configuración segura de productos](https://supabase.com/docs/guides/security/product-security).
