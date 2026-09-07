# Validación de staging y revisión del despliegue

**Actualización 2026-09-07:** se aplicó el endurecimiento de la base de producción
con autorización del usuario. Ver [estado actual](PRODUCTION_SECURITY_STATUS.md).
El inventario y observaciones siguientes son la instantánea previa al despliegue;
la validación completa en staging sigue pendiente.

Estado: preparación lista; ejecución de staging y despliegue pendientes.
Fecha de revisión: 2026-09-06 (America/Buenos_Aires).
Alcance: Security Foundation. CI se añadió al roadmap y sigue pendiente.

## Evidencia disponible

| Comprobación | Resultado |
| --- | --- |
| Última ejecución local de `npm test` | 32 tests pasando, 5 archivos |
| Typecheck / build | Pasaron en la implementación de Security Foundation |
| Proyecto remoto inspeccionado | Pontorno Vault, `mvddulmzyhtsnmorgwgn` |
| Branches Supabase de ese proyecto | Ninguna al consultar |
| Proyecto independiente de staging | No identificado entre los proyectos accesibles |
| Historial remoto de migraciones | Vacío al consultar |
| RPC `create_owned_vault` | No encontrado en el esquema remoto |
| Políticas remotas | Sigue activo el acceso global a SHARED y el autoingreso por `user_id` |
| Funciones SECURITY DEFINER en public/vault_private | Ninguna encontrada en la consulta de preparación |

Las consultas remotas fueron de solo lectura. No se aplicó la migración, no se
crearon usuarios ni entornos y no se cambiaron membresías. El inventario es una
instantánea: repetirlo justo antes de desplegar. Los tests locales usan PostgreSQL
embebido y no certifican Auth, PostgREST ni la configuración de staging.

## Inventario para revisión del propietario

| Elemento | Cantidad / observación |
| --- | --- |
| Bóvedas | 2: una PERSONAL y una SHARED |
| Propietarios distintos | 1 |
| Membresías de bóveda | 2, ambas ADMIN del propietario |
| Miembros adicionales | 0 |
| Credenciales | 1 en SHARED; 0 en PERSONAL |
| Familias / membresías familiares | 0 / 0 |
| family_id de las bóvedas | NULL en ambas |

No aparecen membresías ajenas al propietario en esta instantánea. Esto no demuestra
que nunca existieran ni verifica el descifrado: el propietario debe confirmar ambas
bóvedas y abrir la credencial existente desde su cliente. No se exportó su contenido.
Los IDs y el registro de decisiones se guardan en `review-private/`, ignorado por Git.
La consulta reproducible está en [membership-inventory.sql](review/membership-inventory.sql).

## Preparar el entorno aislado

1. Identificar o provisionar un proyecto/branch de staging dedicado; registrar su ref
   y URL de aplicación. No usar `mvddulmzyhtsnmorgwgn` como entorno de pruebas.
2. Configurar Auth (URL y redirects) y variables públicas del cliente para ese ref.
   Comprobar en las solicitudes de red que el navegador apunta a staging.
3. Preparar una copia del **esquema** actual sin datos reales, reconciliada con las
   migraciones. La migración inicial no incluye todos los cambios históricos, como
   OTP y triggers: no marcarla como aplicada sin comparar el esquema completo.
4. Aplicar `20260907032815_security_foundation.sql` al entorno aislado y desplegar
   el cliente de la misma revisión. Registrar commit y checksum de la migración.
5. Usar cuentas de prueba A, B y C y credenciales ficticias. Crear una fixture compartida
   de READ/WRITE mediante una conexión operadora solo en staging, con wrappers de la
   misma VaultKey generados en clientes de prueba. No exportar UserMasterKeys.
   Esto prepara datos de ensayo, no habilita una ruta de invitación para usuarios.
6. Verificar `vault_private` fuera de los esquemas expuestos por PostgREST. Ejecutar
   advisors y registrar hallazgos por alcance; verificar grants de tablas y columnas.

## Matriz de aceptación por navegador y Data API

Ejecutar las llamadas adversariales con la clave pública y los JWT de cada cuenta,
nunca con service_role. Guardar estado HTTP, cantidad de filas y resultado esperado;
redactar Authorization, apikey, contraseñas, payloads y wrappers de cualquier evidencia.
Un UPDATE/DELETE sin autorización puede responder sin error y afectar cero filas:
comprobar también desde A que el registro original sigue intacto.

| Caso | Acción | Resultado esperado | Estado |
| --- | --- | --- | --- |
| Registro | Registrar A y confirmar email según configuración | Perfil y user_crypto persistidos; una personal utilizable | Pendiente |
| Sesión | Cerrar sesión, ingresar, bloquear y desbloquear | Misma bóveda/clave; contraseña incorrecta rechazada | Pendiente |
| CRUD | A crea, lee, edita y elimina credencial ficticia | Cambios persisten tras recargar/desbloquear | Pendiente |
| Shared | A crea una SHARED explícitamente | Un wrapper ADMIN de A; B no descubre la bóveda | Pendiente |
| Autoingreso | B intenta INSERT/upsert de READ, WRITE y ADMIN a la bóveda de A | Denegado; no aparece membresía | Pendiente |
| Aislamiento | B intenta leer/editar/borrar credenciales y bóveda de A | Sin acceso ni cambios | Pendiente |
| Inmutabilidad | A/B intentan cambiar propietario, familia, autor, vault_id o wrapper | Denegado | Pendiente |
| Lectura compartida | Fixture B READ lee y trata de escribir | Lee y descifra; escritura afecta cero filas o se rechaza | Pendiente |
| Escritura compartida | Fixture C WRITE crea/edita/borra datos ficticios | CRUD autorizado; no eleva permisos ni borra bóveda | Pendiente |
| Conversión | A cambia a PERSONAL una shared con otros miembros | Rechazada; tipo intacto | Pendiente |
| Familias | A crea familia/OWNER; B intenta ingresar como OWNER/ADMIN/MEMBER | Bootstrap A válido; B rechazado | Pendiente |
| Anónimo | Acceder a tablas y RPC sin sesión | Denegado | Pendiente |
| Fallo de carga | Interrumpir consulta; ensayar wrapper inválido en fixture aislada | Carga falla y se bloquea; ninguna clave/bóveda de reemplazo | Pendiente |
| Compatibilidad | Datos cifrados de ensayo creados antes de migrar | Siguen descifrándose con su clave original | Pendiente |

## Decisión de despliegue

- [ ] Entorno de staging identificado y matriz completa con evidencias.
- [ ] Registro, perfil y user_crypto funcionan sobre el esquema reconciliado.
- [ ] Propietario confirma las dos membresías y el descifrado de la credencial real.
- [ ] Inventario repetido antes del cambio, con cada diferencia revisada.
- [ ] Historial vacío reconciliado con el esquema real; no ejecutar un `db push` ciego.
- [ ] Backup y procedimiento de recuperación verificados; cliente y DB coordinados.
- [ ] Advisors y permisos revisados; ningún bypass dentro del alcance pendiente.
- [ ] Riesgos OTP/XSS pendientes visibles en la decisión de lanzamiento.

No desplegar basándose solo en los tests locales. Si hay una falla de compatibilidad,
mantener el servicio restringido y corregir hacia adelante; volver a las políticas
históricas reabre las vulnerabilidades. No eliminar miembros ni recifrar datos como
parte automática de esta preparación.
