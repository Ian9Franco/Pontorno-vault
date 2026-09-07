# Estado de seguridad — 2026-09-07

## Cambios aplicados en producción

Proyecto: `mvddulmzyhtsnmorgwgn` (Pontorno Vault).

| Versión registrada en Supabase | Cambio |
| --- | --- |
| 20260907032815 | Security Foundation: acceso por propietario/membresía, creación atómica, prohibición de autoingreso y de cambios directos de permisos/wrappers |
| 20260907033211 | Cierre del inbox OTP global, perfiles y user_crypto restringidos a su propietario, search_path fijo en handle_updated_at |

Los nombres locales de ambas migraciones coinciden con las versiones asignadas por
Supabase al aplicarlas. La migración inicial de agosto corresponde al esquema manual
preexistente y todavía requiere reconciliación del historial; no ejecutar `db push`
sin revisar esa diferencia. No volver a ejecutar los scripts históricos de `sql/`.

No se borraron ni recifraron datos. Antes y después: 2 bóvedas, 2 membresías,
1 credencial, 0 códigos OTP. Las membresías conservadas pertenecen al propietario.

## Verificación remota realizada

- Bajo `SET LOCAL ROLE authenticated` con identidad ajena: cero filas visibles en
  vaults, vault_members, credentials y user_crypto.
- Sin privilegios para autoingreso, cambio de autor de credenciales o propietario de bóveda.
- `anon` no puede insertar OTP; `authenticated` no puede leer el inbox global.
- Creación por el RPC probada con la identidad del propietario dentro de una transacción
  revertida con ROLLBACK. El RPC funcionó y los conteos finales no cambiaron.
- Advisor: resuelto el search_path mutable. El aviso informativo de OTP sin policies
  refleja el bloqueo deliberado. Sigue pendiente la protección de passwords filtradas.

Estas comprobaciones verifican SQL, roles y grants. No validan login real con JWT,
comportamiento HTTP de PostgREST, sesiones de navegador ni descifrado de la credencial real.

## Cliente actualizado localmente

Actualización UI previa al push: 45 tests pasando, typecheck y build correctos.
Los controles distinguen READ/WRITE/ADMIN de propiedad real; un ADMIN que no es
propietario no administra bóvedas. Cambios y borrados verifican la fila devuelta antes
de modificar el estado visual. El formulario de edición conserva la bóveda original.
Los errores de conexión, permisos y claves existentes se muestran sin afirmar éxito.
Se retiró el acceso a la guía OTP; la simulación restante está rotulada como demo local.
Crear una SHARED explica que no añade miembros y que las invitaciones no están listas.
Los diálogos con secretos se desmontan al bloquear y se limpia la edición pendiente.

Verificación con navegador aislado y datos ficticios en modo demo: registro, creación
de bóveda, alta/edición de credencial y borrado con confirmación. Los distintos permisos
se verifican además con pruebas de renderizado y con las pruebas RLS existentes.
Esto no sustituye los flujos con cuentas Supabase reales en staging.

Verificación del endurecimiento anterior: 37 tests pasando, typecheck y build correctos. En el servidor
de producción local (`next start`), la página respondió 200 con los headers esperados
y el webhook respondió 503/no-store incluso ante JSON inválido, sin procesarlo.

- Creación mediante `create_owned_vault`, sin autoingreso global.
- Errores de lectura abortan la inicialización criptográfica. Se usa INSERT para
  inicializar user_crypto: un intento duplicado no reemplaza la clave previa con UPSERT.
- Cualquier fallo de autenticación/desbloqueo elimina las claves del estado local.
- Webhook OTP devuelve 503 sin procesar el cuerpo ni reflejar códigos; widget pausado
  cuando usa Supabase. El modo demo local conserva la simulación.
- Headers contra framing, MIME sniffing y filtración de referrer; CSP básica de
  frame-ancestors/object/base. **Aún no es una CSP estricta de scripts con nonces.**

El frontend actualizado aún necesita desplegarse en su plataforma. El conector Vercel
no devolvió equipos. Con el cliente antiguo, crear una nueva bóveda falla al usar los
INSERT directos ahora revocados. Lecturas autorizadas de bóvedas existentes se conservan.

## Pendientes que impiden afirmar seguridad completa

1. Identificar y desplegar el frontend actualizado; verificar registro, desbloqueo y CRUD
   por navegador y Data API. El propietario debe comprobar el descifrado de su dato real.
2. Activar leaked password protection de Supabase Auth (requiere disponibilidad/configuración
   del proyecto). [Guía oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
3. Mantener OTP cerrado hasta implementar firma del proveedor, vinculación de destinatarios
   al tenant, TTL, límites y pruebas adversariales. El cierre es contención, no rediseño completo.
4. Invitaciones con distribución de la misma VaultKey, revocación y rotación.
5. CSP estricta y validación XSS con navegador; controles de sesión/MFA y revisión de dependencias.
6. CI y protección de rama del roadmap; staging y reconciliación completa de migraciones.

No restablecer las políticas históricas para recuperar compatibilidad con el cliente antiguo.
Desplegar la versión actualizada o mantener restringidas las operaciones afectadas.
