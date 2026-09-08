# Integración local y revisión de PR — 2026-09-08

No se hizo push, merge remoto ni comentarios en GitHub.

## Sincronización

Main remoto revisado: `c46f699`. Se incorporan los dos commits nuevos: `937bb81` (usuario master sandbox) y `c46f699` (resolución de conflictos de autenticación).

El trabajo local previo quedó respaldado en `f2b2c8d`, rama `codex/sync-main-and-review-prs`. Hubo conflictos en AuthModal, UnlockModal, createAuthActions, createMutationActions y useVaultSession.

Se conserva la interfaz local, animación 3D, preload, política criptográfica, invalidación de operaciones pendientes, alta con Google y cifrado contextual. Se incorpora el sandbox y la persistencia del nombre local. La corrección remota de marcadores ya estaba cubierta localmente; copiar los archivos remotos completos habría eliminado mejoras.

## Sandbox integrado

Almacenamiento separado de la demo personal, acceso explícito «Probar interfaz · Sandbox», restauración bloqueada al recargar y cifrado contextual. CRUD y perfil locales; OTP y Realtime desactivados. La contraseña pública de prueba permanece fija. No se importa ni sobrescribe la antigua demo.

Pruebas con Supabase configurado detectan cualquier acceso remoto y comprueban cifrado, bloqueo durante derivación, contraseña incorrecta, reapertura y conservación de la demo existente.

La verificación visual detectó claves React duplicadas entre CredentialLibrary y OtpInboxWidget: el contador de sesión provocaba acumulación de bibliotecas en el DOM. Se asignaron claves con prefijos distintos, conservando el desmontaje al cambiar de bóveda.

## Cinco PR revisados

Se revisaron metadatos, archivos y patches completos. Los cinco figuran abiertos, con conflictos de merge y estado Vercel fallido. Sin logs del despliegue no se atribuye ese fallo a las dependencias. Ninguno modifica funcionalidades del vault.

| PR | Head revisado | Cambios | Resolución |
| --- | --- | --- | --- |
| [#3](https://github.com/Ian9Franco/Pontorno-vault/pull/3) | `5d521ee` | Solo lockfile: Supabase 2.115.0, Lucide 1.41.0, Next 16.3.4 | Incorporados |
| [#4](https://github.com/Ian9Franco/Pontorno-vault/pull/4) | `630bb79` | Solo lockfile: PostCSS 8.5.28 | Incorporado |
| [#5](https://github.com/Ian9Franco/Pontorno-vault/pull/5) | `1911ef3` | Solo lockfile: @types/react-dom 19.2.7 | Incorporado |
| [#6](https://github.com/Ian9Franco/Pontorno-vault/pull/6) | `9243ae5` | Solo lockfile: Autoprefixer 10.5.5 | Incorporado |
| [#7](https://github.com/Ian9Franco/Pontorno-vault/pull/7) | `58b923e` | Manifest y lockfile: Vitest 5.0.0 | Incorporado y validado |

Ninguna versión propuesta estaba en el lockfile local inicial. Se instalaron juntas sus versiones concretas y se regeneró el lockfile preservando mailauth, mailparser, svix y las dependencias de interfaz.

Se consultó la [guía oficial de Vitest 5](https://vitest.dev/guide/migration/), incluido clearMocks por defecto. Node local y CI usan 24; no fue necesario modificar la configuración de tests.

## Validación

- TypeScript correcto.
- 19 archivos de tests y 88 pruebas correctas con Vitest 5.0.0.
- Build de producción correcto con Next 16.3.4.
- npm audit: 0 vulnerabilidades.
- Navegador sobre build de producción: acceso, bloqueo, recarga bloqueada y reapertura del sandbox correctos; sin errores JavaScript, una única biblioteca tras varias actualizaciones y sin desbordamiento horizontal.

## Pendiente externo

Los PR siguen abiertos. Tras una futura publicación y CI verde, verificar que sus cambios se reconozcan como incorporados antes de cerrarlos; no asumir cierre automático. La recepción real OTP sigue pendiente de Resend, dominio, secretos y prueba de entrega real. No se modificó configuración remota durante esta integración.
