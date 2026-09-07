# Security Foundation

**Actualización 2026-09-07:** las dos migraciones de endurecimiento ya se aplicaron en
producción. Consultar [estado y verificaciones](PRODUCTION_SECURITY_STATUS.md); ese
informe reemplaza las notas de preparación previas al despliegue de la base.

## Alcance y estado

La migración `20260907032815_security_foundation.sql` endurece familias, membresías,
bóvedas y credenciales. No se aplica automáticamente a producción al ejecutar tests.
Reemplaza todas las policies de esas cinco tablas, incluso policies históricas con
nombres desconocidos, y reduce los grants. No cambia `profiles`, `user_crypto` ni OTP.

Una bóveda SHARED no es pública. Solo su propietario y sus miembros pueden ver su
metadata; solo miembros pueden leer ciphertext. READ permite lectura y WRITE/ADMIN
permiten escribir credenciales. Solo el propietario puede editar/eliminar la bóveda.
La identidad, familia y autor de una credencial no pueden reasignarse con UPDATE.
La conversión a PERSONAL se rechaza si quedan otros miembros.

`vault_members` es de solo lectura para clientes. Ningún miembro, ni ADMIN, puede
insertar miembros, elevar permisos, sustituir wrappers o borrar membresías. Familias
permiten únicamente creación propia y bootstrap del creador como OWNER. No existe
todavía una API de gobierno familiar ni de revocación de miembros individuales.

## Creación y distribución de claves

El cliente genera una VaultKey únicamente para una bóveda nueva y envía su wrapper
AES-GCM a `create_owned_vault`. La función crea la bóveda y su membresía de propietario
en la misma transacción. El caller no elige propietario, destinatario, ID o permisos.
La implementación SECURITY DEFINER está en `vault_private`, con search_path vacío,
identidad explícita y EXECUTE restringido. El wrapper público es SECURITY INVOKER.
Mantener `vault_private` fuera de los esquemas expuestos por la Data API.

El primer ingreso crea solo una bóveda personal. Crear una SHARED es explícito y
inicialmente solo su propietario tiene acceso. Se eliminó el descubrimiento y
autoingreso global. Un error de consulta o unwrap aborta la carga y bloquea el estado
local; nunca se interpreta como ausencia de bóvedas ni autoriza nuevas claves.

El protocolo completo de invitación queda pendiente: autenticar la identidad y clave
pública del destinatario, transferir la VaultKey existente cifrada para ese destinatario,
aceptar la invitación con una operación atómica y producir su wrapper local. También
requiere expiración, protección contra replay y rotación al revocar. No se deben pedir
ni transmitir las UserMasterKeys. SQL no puede verificar que dos wrappers contienen
la misma VaultKey; esa propiedad requiere el protocolo y pruebas criptográficas.

## Despliegue y datos existentes

Preparación y resultados del inventario: [validación de staging](STAGING_VALIDATION.md).

1. Respaldar la base y exportar metadata de propietarios/membresías para revisión.
2. Inventariar políticas, grants (incluidos grants por columna) y funciones privilegiadas
   del proyecto destino; las pruebas cubren los dos esquemas versionados, no todo posible
   estado remoto. Revisar cualquier RPC antigua que permita escribir estas tablas.
3. Aplicar esta migración como cambio incremental; no volver a ejecutar `sql/*.sql`.
   En instalaciones creadas con SQL manual, reconciliar el historial antes de `db push`:
   la migración inicial ya existe conceptualmente y no debe repetirse sobre esas tablas.
4. Desplegar el cliente que usa el RPC. La versión anterior ya no puede crear bóvedas
   porque los INSERT directos están revocados. Priorizar la migración de seguridad.
5. Ejecutar advisors y pruebas de integración con cuentas aisladas en staging, incluyendo
   registro, desbloqueo, creación y CRUD a través de la Data API.
6. Auditar con los propietarios cada membresía preexistente antes de reabrir el servicio.

**La migración conserva datos y membresías existentes.** Una membresía maliciosa creada
antes del cierre aún concede acceso según su permiso. No hay información suficiente para
identificarla automáticamente: no borrar ni legitimar miembros por su mero registro.
Los wrappers distintos que generó el autoingreso anterior tampoco se reparan: recuperar
y recifrar datos requiere los clientes con las claves correctas. Revocar acceso futuro
no elimina ciphertext ni claves que alguien ya haya copiado.

## Verificación reproducible

`npm run test:security` ejecuta PostgreSQL embebido (PGlite), no mocks de SQL. Carga
cada esquema histórico, grants amplios y una policy permisiva adicional; luego aplica
la migración real. Prueba roles anon/authenticated, usuarios A/B/C, aislamiento,
escalación, READ/WRITE, autoría, propiedades inmutables, creación y borrado.
Solo se simula el contrato mínimo de Supabase Auth (`auth.users`, `auth.uid`, `auth.role`).
Esto no sustituye pruebas HTTP de PostgREST, JWT, configuración remota o advisors.

`npm test` incluye además regresiones del cliente con claves Web Crypto reales: conservar
wrappers existentes, crear solo una personal y rechazar errores sin crear reemplazos.
`npm run typecheck` y `npm run build` completan la validación local.

El webhook/inbox OTP, CSP, CI general y el protocolo completo de sharing siguen fuera
de este cambio. El proyecto no debe considerarse completamente endurecido por este PR.
