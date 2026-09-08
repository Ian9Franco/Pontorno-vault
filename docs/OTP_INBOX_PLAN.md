# Plan de recepción de códigos — 7 de septiembre de 2026

## Experiencia propuesta

En una credencial, el propietario activa «Recibir códigos». Se crea un alias aleatorio
por servicio y bóveda, por ejemplo `r-<token>@codigos.<dominio-propio>`. Desde el correo
donde hoy llegan los códigos configura un filtro que reenvía únicamente los mensajes
de acceso de ese servicio. Cada correo nuevo coincidente dispara la recepción aunque
el vault esté cerrado; al abrirlo, los miembros autorizados ven los códigos vigentes.

Mostrar servicio, cuenta identificada parcialmente, hora de llegada, vencimiento,
estado y botón Copiar. No identificar quién intentó iniciar sesión a menos que el
proveedor lo informe: recibir un mail prueba la recepción de un desafío, no un login
exitoso ni la identidad de quien lo solicitó. Dos intentos concurrentes se muestran
separados y ordenados; avisar que el proveedor puede invalidar el código anterior.

## Qué puede llegar

| Método del servicio | Tratamiento |
| --- | --- |
| Código enviado por email | Primera versión: extraer solo el OTP y conservar metadatos mínimos. |
| Correo difícil de interpretar | Estado «No pudimos identificar el código». Opción explícita futura de guardar el texto del mensaje cifrado y con vencimiento. Nunca adivinar un número. |
| Enlace de acceso | Segunda versión: validar HTTPS y dominios exactos del servicio; abrir solo por acción del usuario. No visitar enlaces automáticamente. |
| TOTP de una app autenticadora | Integración distinta: alta consentida de la semilla cifrada y generación local. No llega ningún email. |
| SMS, push, passkey | Fuera de la primera versión; requieren otros mecanismos y no se convierten en correo automáticamente. |

## Opción elegida y alternativas

Recomiendo **reenvío selectivo + dominio receptor propio + proveedor de correo entrante**.
No requiere acceso general al buzón personal. Gmail permite filtros que reenvían
mensajes nuevos según criterios; la configuración debe verificar primero la dirección
de reenvío. El filtro se revisa con ejemplos reales de cada servicio para evitar incluir
facturas, marketing, restablecimientos de contraseña u otros correos privados.
[Documentación de Gmail](https://support.google.com/mail/answer/6579?hl=es).

Resend es un candidato para recibir correo y emitir webhooks; confirmar dominio,
MX, disponibilidad, retención, límites y coste del plan al implementarlo. Un subdominio
dedicado evita modificar el MX del correo principal.
[Recepción en Resend](https://resend.com/docs/dashboard/receiving/introduction).

Alternativas: cambiar el email de la suscripción al alias (puede redirigir también
facturas y recuperación, y algunos servicios lo rechazan), o conectar Gmail/Outlook
con OAuth y procesar una etiqueta/carpeta. Esta última opción añade permisos de buzón,
renovaciones y más operación; no se recomienda como primera versión.

El reenvío normal transmite el mensaje completo al receptor. «Solo el código» significa
que el vault extrae y guarda solo el código; no que el proveedor de recepción nunca
vea el mail. Para que solo salga el código del buzón sería necesario un extractor
en el origen con permisos de lectura, otra integración y otro límite de confianza.

## Arquitectura

`Servicio → buzón original → filtro → alias → proveedor → webhook verificado → cola
durable → parser específico → cifrado OTP → almacenamiento por bóveda → aviso → cliente desbloqueado`.

1. Alta del alias solo por propietario autorizado. Token aleatorio de al menos 128
   bits, revocable/rotativo; mapearlo internamente a bóveda, credencial y servicio.
   No confiar en `vault_id` enviado en el body. Un alias es una ruta, no autorización
   suficiente para aceptar cualquier remitente.
2. Verificar firma sobre cuerpo crudo, timestamp y ventana anti-replay; limitar tamaño
   antes de leer/parsing. Encolar de forma durable antes de confirmar recepción.
   Unicidad del ID de evento por proveedor y alias para tolerar reintentos sin duplicar.
   [Firma de webhooks de Resend](https://resend.com/docs/webhooks/verify-webhooks-requests).
3. Obtener el contenido por ID autenticado del proveedor cuando el webhook incluya
   solo metadatos. Sin descargas de adjuntos, imágenes ni URLs del mensaje. Límites de
   tamaño, tiempos y tasa por alias/tenant; cola de fallos sin almacenar secretos en logs.
4. Comprobar remitentes/dominios exactos y resultados de autenticación aportados por
   infraestructura confiable. Firma del webhook autentica al proveedor, no al autor
   del email. Evaluar DKIM/DMARC y efectos del forwarding/ARC con casos reales; no
   confiar en headers `Authentication-Results` copiados dentro del cuerpo.
5. Parser por servicio con fixtures anonimizados. Rechazar números ambiguos, mensajes
   de recuperación y remitentes parecidos. No reutilizar el fallback genérico actual
   como decisión de seguridad ni tratar `sender.includes('netflix')` como autenticación.
6. Guardar un sobre cifrado por código, `vault_id`, `credential_id`, alias, ID único
   de recepción, hora y vencimiento. TTL conservador si el servicio no declara uno;
   nunca afirmar vigencia exacta sin evidencia. El servidor excluye vencidos de lecturas;
   un job los elimina y se define también retención de colas, backups y proveedor.
7. Realtime emite un aviso sin OTP; el cliente consulta lo autorizado y descifra después
   del desbloqueo. Recuperación al reconectar y sondeo acotado como fallback. Notificaciones
   de pantalla bloqueada nunca incluyen el secreto.

## Cifrado y aislamiento antes de habilitar

La ingesta debe funcionar sin conocer la contraseña maestra y con todos los navegadores
cerrados. Por eso no puede simplemente pedir la clave simétrica de bóveda al cliente.
Propuesta: generar un par de claves de recepción por bóveda en el navegador; guardar
la privada envuelta por la clave de bóveda y publicar solo la pública al receptor.
Usar un esquema híbrido estándar revisado (p. ej. RSA-OAEP/SHA-256 para envolver una
clave AES-GCM aleatoria por mensaje), con versión, `key_id` y contexto autenticado.
El servidor cifra y los miembros autorizados descifran localmente.

El proveedor y el proceso de ingesta ven temporalmente el OTP en claro. Esta solución
protege los códigos almacenados, pero no da confidencialidad frente al receptor
comprometido; tampoco protege contra sustitución maliciosa de su clave pública.
Documentar ese límite sin prometer cifrado de extremo a extremo desde el servicio.

RLS requiere membresía vigente y permiso específico para leer OTP, además del `vault_id`.
El bloqueo visual local no es autorización de servidor. Guardar OTP en claro bajo una
sesión Supabase válida expondría códigos aunque la UI dijera «bloqueado». La clave
privada envuelta resuelve ese límite para el almacenamiento, no para una sesión ya
comprometida mientras está desbloqueada. Nunca entregar service-role al navegador.

Al revocar un miembro, rotar claves para futuros códigos; no se pueden retirar códigos
ya copiados. Compartir contraseña y OTP con los mismos miembros concentra ambos
factores: usar MFA independiente para entrar al propio vault y hacer explícito quién
puede ver cada código. No reenviar los factores del propio vault a su bandeja.

## Estado del repositorio y fases

- Existen `OtpInboxWidget.tsx`, `otp-parser.ts` y tests de parser.
- `/api/webhooks/email-otp` devuelve 503/no-store deliberadamente.
- La migración `20260907033211_close_unsafe_otp_and_harden_profiles.sql` retiró el
  acceso al inbox global. No reabrir esa tabla sin rediseño por bóveda.
- La modalidad local solo simula códigos; no demuestra entrega de correos reales.

1. **Prueba de recepción en staging:** elegir dominio/proveedor y un servicio; verificar
   alias, filtro y entrega con correos de prueba. Validar también la confirmación inicial
   del reenvío por un flujo de setup restringido al propietario, sin convertirlo en
   un parser abierto de enlaces de validación.
2. **Backend seguro:** alias, cola, firma, parser, cifrado asimétrico, RLS, TTL y métricas
   de entrega sin cuerpos ni códigos. Diseñar la distribución de claves antes de migrar datos.
3. **Interfaz:** activación, prueba de conexión, lista de códigos, copiar, vencidos,
   errores y pausado. Historial mínimo de recepción; «descartado» no equivale a consumido
   en el proveedor, algo que el vault normalmente no puede saber.
4. **Piloto:** dos usuarios/bóvedas, varios logins simultáneos, navegador cerrado y
   reconexión. Expandir servicio por servicio tras validar sus formatos.

## Criterios de aceptación

- Un correo válido produce exactamente un código visible solo en su bóveda desbloqueada.
- Otro usuario no puede leerlo vía API ni suscribirse a avisos de esa bóveda.
- Firma inválida, replay, alias revocado, remitente falso, adjuntos y códigos ambiguos
  no generan OTP utilizables; reintentos legítimos son idempotentes.
- Un código vencido no puede copiarse ni recuperarse por API; la limpieza es verificable.
- Fallos de proveedor/cola se reintentan y alertan sin exponer el contenido.
- Medir latencia desde recepción del proveedor hasta el vault y tasa de entrega por
  servicio. La meta inicial puede ser menos de 10 segundos desde el webhook, no una
  garantía sobre el tiempo de entrega del correo original.

«Siempre que alguien inicia» solo puede cubrir desafíos que el servicio efectivamente
envía por un canal configurado. No existe garantía universal: filtros, antispam,
servicios, red y proveedores pueden fallar. El producto debe mostrar salud de la
conexión y última recepción, y mantener el buzón original como respaldo.
