# Family Vault — Documento Maestro de Arquitectura

## 1. Objetivo del proyecto

**Family Vault** es una web app familiar para almacenar, organizar y compartir de forma segura credenciales de cuentas y servicios.

El objetivo funcional es permitir que distintos miembros de una familia puedan:

- Crear una cuenta.
- Pertenecer a una familia o workspace.
- Guardar credenciales de plataformas y suscripciones.
- Añadir, editar y eliminar credenciales.
- Consultar usuario, contraseña, URL y notas.
- Compartir determinadas credenciales con otros miembros.
- Mantener credenciales privadas separadas de las compartidas.
- Acceder desde distintos dispositivos.
- Desbloquear sus bóvedas mediante una contraseña maestra.

Además de resolver una necesidad real, el proyecto debe servir como pieza de portfolio y demostrar:

- Arquitectura frontend moderna.
- TypeScript.
- Next.js.
- PostgreSQL.
- Supabase.
- Autenticación.
- Row Level Security.
- Criptografía aplicada.
- Diseño zero-knowledge.
- Modelado de amenazas.
- Diseño multiusuario.
- Gestión de permisos.
- Buenas prácticas de seguridad web.

---

# 2. Decisión principal: arquitectura Zero-Knowledge

La aplicación debe diseñarse bajo un modelo **zero-knowledge**.

Esto significa que el servidor puede almacenar y sincronizar los datos, pero no debe poseer el material criptográfico necesario para conocer las credenciales en texto plano.

La regla principal del sistema es:

> Ningún secreto necesario para descifrar una credencial debe abandonar el dispositivo del usuario sin estar previamente cifrado.

Por lo tanto:

- La contraseña maestra nunca se envía a Supabase.
- Las credenciales nunca se envían en texto plano.
- Las claves privadas de descifrado nunca se envían en texto plano.
- El cifrado ocurre en el cliente.
- El descifrado ocurre en el cliente.
- Supabase almacena únicamente ciphertext, metadata segura y claves previamente envueltas/cifradas.

---

# 3. Supabase: sí es necesario

Zero-knowledge no significa “sin backend” ni “sin base de datos”.

Supabase sigue siendo útil para:

- Autenticación.
- Usuarios.
- Familias.
- Membresías.
- Roles.
- Permisos.
- Sincronización.
- PostgreSQL.
- Row Level Security.
- Auditoría.
- Almacenamiento de payloads cifrados.
- Gestión de invitaciones.
- Eventual realtime.

La diferencia es que Supabase funciona como capa de almacenamiento y autorización, no como autoridad criptográfica.

Conceptualmente:

```text
┌──────────────────────────────┐
│          CLIENTE             │
│                              │
│ Master Password              │
│ Argon2id                     │
│ AES-GCM                      │
│ Encryption                   │
│ Decryption                   │
│ Plaintext credentials        │
└───────────────┬──────────────┘
                │
                │ ciphertext
                ▼
┌──────────────────────────────┐
│          SUPABASE            │
│                              │
│ Auth                         │
│ PostgreSQL                   │
│ RLS                          │
│ Memberships                  │
│ Permissions                  │
│ Encrypted payloads           │
└──────────────────────────────┘
```

Supabase guarda la bóveda.

El cliente tiene la llave.

---

# 4. Stack recomendado

## Frontend

- Next.js
- TypeScript
- React
- App Router

## Backend / infraestructura

- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security

## Criptografía

- Web Crypto API
- AES-256-GCM para cifrado autenticado.
- Argon2id para derivación desde la contraseña maestra.
- Implementación Argon2id auditada, preferentemente mediante WASM.

## Backend adicional

No es necesario incorporar inicialmente un backend Node separado.

Para el MVP:

```text
Next.js
+
Supabase
+
Web Crypto API
+
Argon2id
```

es suficiente.

---

# 5. Separación entre autenticación y criptografía

La contraseña de autenticación y la contraseña maestra representan responsabilidades diferentes.

## Account Password

Sirve para responder:

> ¿Quién sos?

Es utilizada por Supabase Auth.

## Master Password

Sirve para responder:

> ¿Podés descifrar esta bóveda?

Debe utilizarse únicamente en el cliente.

La separación conceptual es:

```text
SUPABASE AUTH
"¿Quién sos?"

        +

CRYPTOGRAPHIC VAULT
"¿Podés abrir estos datos?"
```

La contraseña maestra nunca debería enviarse a:

- Supabase.
- Server Actions.
- Route Handlers.
- API Routes.
- Edge Functions.
- Logs.
- Analytics.
- Servicios externos.

---

# 6. Dónde sucede el cifrado

Todo secreto se cifra **antes de abandonar el navegador**.

Ejemplo:

```text
Usuario ingresa:

Netflix
family@example.com
MiPassword123!

        ↓

Frontend Next.js

        ↓

Cifrado local

        ↓

AES-256-GCM

        ↓

ciphertext + nonce

        ↓

Supabase
```

Supabase nunca debería recibir:

```text
Netflix
family@example.com
MiPassword123!
```

Debe recibir algo similar a:

```text
encrypted_payload:
"8fK3mP9x..."

nonce:
"2aX91..."
```

Al leer:

```text
Supabase
   ↓
ciphertext
   ↓
Browser
   ↓
decrypt()
   ↓
plaintext
```

---

# 7. Envelope Encryption

No se recomienda utilizar directamente una clave derivada de la master password para cifrar todas las credenciales.

Debe utilizarse **envelope encryption**.

Arquitectura:

```text
Master Password
      ↓
Argon2id
      ↓
KEK
Key Encryption Key
      ↓
decrypt
      ↓
User Master Key
      ↓
decrypt
      ↓
Vault Key
      ↓
AES-256-GCM
      ↓
Credentials
```

---

# 8. Password → KEK

La contraseña maestra se transforma mediante Argon2id en una clave denominada:

**KEK — Key Encryption Key**

Ejemplo conceptual:

```text
KEK = Argon2id(
    masterPassword,
    salt,
    parameters
)
```

El salt no necesita ser secreto.

Los parámetros de Argon2id deben almacenarse junto al usuario para permitir futuras migraciones.

---

# 9. User Master Key

Al crear la cuenta se genera una clave aleatoria criptográficamente segura.

Ejemplo conceptual:

```text
User Master Key
= random 256-bit key
```

Esta clave no deriva directamente de la contraseña del usuario.

Se cifra utilizando la KEK:

```text
encrypted_user_key =
    AES-GCM(
        UserMasterKey,
        KEK
    )
```

Supabase almacena:

```text
encrypted_user_key
salt
nonce
kdf_algorithm
kdf_parameters
crypto_version
```

Supabase no conoce:

```text
master_password
KEK
UserMasterKey
```

---

# 10. Ventaja del modelo de claves

Este diseño permite cambiar la contraseña maestra sin recifrar todas las credenciales.

Si el usuario cambia:

```text
MasterPassword_A
```

por:

```text
MasterPassword_B
```

solo es necesario:

```text
MasterPassword_A
      ↓
KEK_A
      ↓
decrypt UserMasterKey

MasterPassword_B
      ↓
KEK_B
      ↓
encrypt UserMasterKey
```

Las credenciales pueden permanecer exactamente iguales.

---

# 11. Vault Keys

Cada bóveda debe tener una clave criptográfica independiente.

Ejemplo:

```text
Ian
 ├── Personal Vault
 │      └── VaultKey_A
 │
 └── Family Vault
        └── VaultKey_B
```

Las credenciales pertenecientes a cada vault se cifran utilizando su correspondiente `VaultKey`.

Esto permite:

- Compartir bóvedas.
- Revocar usuarios.
- Crear bóvedas privadas.
- Separar niveles de acceso.
- Rotar claves.
- Evitar una única clave global para toda la aplicación.

---

# 12. Compartición familiar

No debe existir una “master password familiar”.

Cada usuario mantiene su propia identidad criptográfica.

Ejemplo conceptual:

```text
                Family Vault Key
                   /    |    \
                  /     |     \
                 /      |      \
              Ian     Padre   Madre
```

Cada miembro autorizado recibe una versión cifrada de la `VaultKey`.

Conceptualmente:

```text
vault_members

Ian:
encrypted_vault_key_A

Padre:
encrypted_vault_key_B

Madre:
encrypted_vault_key_C
```

La clave real del vault es la misma.

La representación cifrada para cada miembro puede ser diferente.

---

# 13. Modelo funcional

Una organización familiar puede verse así:

```text
Familia
├── Family Vault
│   ├── Netflix
│   ├── Disney+
│   ├── Spotify
│   ├── ISP
│   └── Servicios
│
├── Ian Personal
│   └── credenciales privadas
│
└── Parents Vault
    └── credenciales privadas
```

---

# 14. Entidades principales

## profiles

Información pública/no sensible del usuario.

```text
profiles
- id
- display_name
- created_at
- updated_at
```

---

## families

Representa una familia/workspace.

```text
families
- id
- name
- created_by
- created_at
```

---

## family_members

Relación usuario-familia.

```text
family_members
- family_id
- user_id
- role
- joined_at
```

Roles iniciales posibles:

```text
OWNER
ADMIN
MEMBER
```

---

## vaults

Bóvedas donde viven las credenciales.

```text
vaults
- id
- family_id
- owner_user_id
- name
- type
- created_at
- updated_at
```

Tipos posibles:

```text
PERSONAL
SHARED
```

---

## vault_members

Usuarios autorizados para utilizar una bóveda.

```text
vault_members
- vault_id
- user_id
- encrypted_vault_key
- nonce
- permissions
- created_at
```

---

## credentials

Credenciales cifradas.

```text
credentials
- id
- vault_id
- encrypted_payload
- nonce
- crypto_version
- created_by
- created_at
- updated_at
```

---

## user_crypto

Material criptográfico público/cifrado necesario para desbloquear la cuenta.

```text
user_crypto
- user_id
- encrypted_user_key
- user_key_nonce
- kdf_salt
- kdf_algorithm
- kdf_parameters
- encryption_version
- created_at
- updated_at
```

---

# 15. Contenido de una credential

Antes del cifrado:

```json
{
  "platform": "Netflix",
  "username": "family@example.com",
  "password": "example-secret",
  "url": "https://netflix.com",
  "notes": "Cuenta familiar"
}
```

Después del cifrado, Supabase debería ver esencialmente:

```text
credential_id

vault_id

encrypted_payload
"Jj8f1Cx9mLq4..."

nonce
"u83kX..."

crypto_version
1
```

---

# 16. Metadata sensible

Idealmente se cifra todo aquello que pueda revelar información relevante.

Por ejemplo, almacenar:

```text
platform = "Banco Galicia"
username = "ian@email..."
```

en texto plano puede filtrar información aunque la contraseña esté cifrada.

Por esto conviene que el `encrypted_payload` contenga:

- plataforma.
- username.
- password.
- URL.
- notas.
- etiquetas sensibles.

Supabase debería recibir únicamente la metadata estrictamente necesaria para operar.

---

# 17. Nonces

AES-GCM requiere un nonce/IV.

El nonce:

- No necesita ser secreto.
- Debe ser único para cada operación con una misma clave.
- Debe almacenarse junto al ciphertext.
- Nunca debe reutilizarse intencionalmente con la misma clave.

Ejemplo:

```text
encrypted_payload
+
nonce
+
crypto_version
```

---

# 18. Flujo de creación de cuenta

Conceptualmente:

```text
1. Usuario crea cuenta en Supabase Auth.

2. Usuario define Master Password.

3. Cliente genera:
   - random salt
   - UserMasterKey aleatoria

4. Cliente calcula:
   KEK = Argon2id(masterPassword, salt)

5. Cliente cifra:
   encryptedUserKey =
       AES-GCM(UserMasterKey, KEK)

6. Cliente envía a Supabase:
   - salt
   - encryptedUserKey
   - nonce
   - Argon2 parameters
   - crypto version

7. Master Password desaparece de memoria cuando sea posible.
```

---

# 19. Flujo de desbloqueo

```text
1. Usuario inicia sesión mediante Supabase Auth.

2. Cliente obtiene:
   - kdf_salt
   - kdf_parameters
   - encrypted_user_key
   - nonce

3. Usuario ingresa Master Password.

4. Cliente calcula:
   KEK = Argon2id(masterPassword, salt)

5. Cliente intenta descifrar UserMasterKey.

6. Si AES-GCM valida correctamente:
   Vault unlocked.

7. Si falla:
   Master Password incorrecta.
```

---

# 20. Flujo de creación de credencial

```text
1. Usuario desbloquea el vault.

2. Cliente obtiene VaultKey.

3. Usuario introduce:
   platform
   username
   password
   url
   notes

4. Cliente serializa payload.

5. Cliente genera nonce único.

6. Cliente ejecuta AES-256-GCM.

7. Cliente envía a Supabase:
   encrypted_payload
   nonce
   vault_id
   crypto_version
```

Nunca debe enviarse el payload original.

---

# 21. Flujo de lectura

```text
1. Cliente consulta Supabase.

2. RLS verifica autorización.

3. Supabase devuelve:
   encrypted_payload
   nonce

4. Cliente utiliza VaultKey.

5. AES-GCM descifra localmente.

6. UI muestra credencial.
```

---

# 22. Flujo de edición

La edición consiste en:

```text
decrypt old payload
      ↓
modify locally
      ↓
generate new nonce
      ↓
encrypt complete payload
      ↓
replace ciphertext
```

Nunca editar parcialmente el contenido sensible en el servidor.

---

# 23. Flujo de eliminación

Inicialmente puede hacerse:

```text
DELETE credential
```

Más adelante puede implementarse:

```text
soft delete
+
trash
+
retention period
```

Para una primera versión de portfolio, puede ser interesante soportar papelera.

---

# 24. Seguridad de Supabase

Supabase debe considerarse una infraestructura **no confiable desde el punto de vista criptográfico**.

Aunque confiemos operacionalmente en Supabase, el modelo debe asumir:

> Un atacante puede llegar a obtener una copia completa de PostgreSQL.

El resultado deseado es que esa persona encuentre:

```text
ciphertext
nonces
salts
IDs
timestamps
```

pero no pueda recuperar las credenciales sin las claves correspondientes.

---

# 25. Row Level Security

Zero-knowledge no reemplaza RLS.

Ambas capas resuelven problemas distintos.

## RLS protege:

- Qué registros puede descargar un usuario.
- Qué vaults puede modificar.
- Qué familias puede consultar.
- Qué credenciales puede eliminar.

## Criptografía protege:

- Qué información puede comprender alguien que obtiene los registros.

Por lo tanto:

```text
Authorization
+
Encryption
=
Defense in depth
```

---

# 26. Riesgo crítico: XSS

Uno de los riesgos más importantes de un password manager web es XSS.

Cuando la bóveda está desbloqueada, el navegador posee temporalmente claves y plaintext.

Un script malicioso ejecutándose dentro del mismo contexto puede intentar acceder a ellos.

Por eso deben utilizarse:

- CSP estricta.
- Sanitización.
- Cero HTML arbitrario.
- Evitar `dangerouslySetInnerHTML`.
- Trusted Types cuando sea viable.
- Dependencias mínimas.
- Auditoría de paquetes.
- Subresource Integrity cuando corresponda.
- Evitar scripts de terceros dentro de la aplicación autenticada.

No deberían instalarse en la bóveda herramientas como:

- Hotjar.
- Session replay.
- Trackers arbitrarios.
- Pixels innecesarios.
- Scripts publicitarios.

---

# 27. LocalStorage

No almacenar en `localStorage`:

- Master Password.
- KEK.
- User Master Key.
- Vault Keys.
- Plaintext credentials.

Idealmente las claves se mantienen únicamente:

- En memoria.
- Durante una sesión desbloqueada.
- Durante el menor tiempo razonable.

---

# 28. Auto-lock

La aplicación debería bloquear la bóveda automáticamente después de inactividad.

Ejemplo:

```text
5 min / 10 min / configurable
```

Al bloquear:

```text
clear decrypted state
clear vault keys
clear UserMasterKey
clear sensitive React state
```

El usuario puede seguir autenticado en Supabase pero tener la bóveda bloqueada.

Esto refuerza nuevamente la separación:

```text
Authenticated ≠ Vault Unlocked
```

---

# 29. Clipboard

Copiar contraseñas debería:

- Utilizar Clipboard API.
- Evitar logs.
- No almacenar historial interno.
- Opcionalmente limpiar el clipboard después de un tiempo cuando la plataforma lo permita.

---

# 30. Generador de contraseñas

Feature recomendable.

Debe utilizar:

```text
crypto.getRandomValues()
```

Nunca:

```text
Math.random()
```

---

# 31. Seguridad de logs

Nunca registrar:

```text
password
masterPassword
plaintext credential
KEK
VaultKey
UserMasterKey
```

Tampoco en:

- console.log.
- Sentry breadcrumbs.
- analytics.
- error payloads.
- network traces.

---

# 32. Threat Model inicial

La aplicación debe considerar, como mínimo, estos escenarios.

## Base de datos filtrada

Resultado deseado:

El atacante obtiene ciphertext, pero no credenciales.

---

## Supabase comprometido

Resultado deseado:

El atacante puede servir o leer datos cifrados, pero no posee las claves históricas de los vaults.

---

## Sesión Supabase robada

Resultado deseado:

El atacante podría descargar ciphertext permitido por esa sesión, pero todavía necesita desbloquear criptográficamente la bóveda.

---

## Master Password débil

Riesgo:

Ataques offline contra:

```text
encrypted_user_key
+
salt
```

Mitigación:

- Argon2id.
- Parámetros costosos.
- Requisitos razonables de contraseña.
- Indicador de fortaleza.
- Opcionalmente passphrase.

---

## XSS

Riesgo:

Puede comprometer una bóveda desbloqueada.

Mitigación:

- CSP.
- dependencias auditadas.
- arquitectura estricta.
- sanitización.
- cero scripts innecesarios.

---

## Dispositivo comprometido

Un dispositivo con malware puede capturar:

- master password.
- clipboard.
- plaintext.
- teclado.

Zero-knowledge no puede resolver completamente este escenario.

Debe documentarse como una limitación del modelo.

---

# 33. Qué NO hacer

No implementar:

```text
AES.encrypt(password, process.env.SECRET_KEY)
```

y llamar a eso zero-knowledge.

Si el backend posee:

```text
ciphertext
+
SECRET_KEY
```

puede descifrar los datos.

Eso es cifrado server-side, no zero-knowledge.

---

Tampoco enviar:

```text
POST /unlock

{
  "masterPassword": "..."
}
```

La Master Password no debe tocar el backend.

---

# 34. MVP funcional

Primera versión recomendable:

1. Registro.
2. Login.
3. Logout.
4. Configuración de Master Password.
5. Unlock del vault.
6. Crear familia.
7. Crear vault personal.
8. Crear vault compartido.
9. Invitar miembros.
10. Crear credencial.
11. Editar credencial.
12. Eliminar credencial.
13. Mostrar/ocultar contraseña.
14. Copiar username.
15. Copiar password.
16. Buscar credenciales.
17. Auto-lock.
18. RLS.
19. Cifrado client-side.
20. Sincronización entre dispositivos.

---

# 35. Features posteriores

## Seguridad

- WebAuthn.
- Passkeys.
- MFA.
- Recovery codes.
- Device management.
- Active sessions.
- Vault key rotation.

## Password intelligence

- Detección de contraseñas repetidas.
- Contraseñas débiles.
- Edad de contraseña.
- Generador seguro.

## UX

- Favicons.
- Categorías.
- Tags.
- Favoritos.
- Historial.
- Papelera.
- Búsqueda avanzada.

## Sharing

- Acceso por credencial.
- Permisos read-only.
- Compartición temporal.
- Revocación inmediata.
- Auditoría.

---

# 36. Consideración importante: recuperación de cuenta

Zero-knowledge introduce un problema real:

> Si nadie posee la clave necesaria para abrir los datos, el servidor tampoco puede “resetear” mágicamente la contraseña maestra.

La recuperación debe diseñarse explícitamente.

Opciones futuras:

- Recovery key generada durante onboarding.
- Emergency kit descargable.
- Trusted family recovery.
- Shamir Secret Sharing.
- Device-based recovery.
- Recovery mediante otra clave criptográfica.

No debe diseñarse una recuperación que implique guardar la Master Password en el servidor.

---

# 37. Estructura de código sugerida

```text
src/
├── app/
│   ├── auth/
│   ├── dashboard/
│   ├── vault/
│   └── settings/
│
├── components/
│
├── lib/
│   ├── crypto/
│   │   ├── argon.ts
│   │   ├── aes.ts
│   │   ├── keys.ts
│   │   ├── vault.ts
│   │   └── serialization.ts
│   │
│   ├── supabase/
│   │   ├── client.ts
│   │   └── types.ts
│   │
│   └── security/
│
├── stores/
│   └── vault-session.ts
│
└── types/
```

---

# 38. Regla Next.js

El código que maneja secretos debe ejecutarse en cliente.

Evitar enviar plaintext a:

```text
Server Components
Server Actions
API Routes
Route Handlers
Middleware
Edge Functions
```

La criptografía sensible debe ejecutarse en módulos client-side.

---

# 39. Separación de responsabilidades

## Supabase

Responsable de:

```text
Identity
Authorization
Storage
Synchronization
Membership
Permissions
```

## Cliente

Responsable de:

```text
Key derivation
Encryption
Decryption
Vault unlocking
Plaintext handling
```

---

# 40. Objetivo de seguridad

La propiedad que queremos poder afirmar es:

> The backend is treated as an untrusted storage and synchronization layer. Plaintext credentials and usable decryption keys never leave the client.

Y ante una filtración completa de PostgreSQL:

> La confidencialidad de las credenciales continúa dependiendo de las claves del usuario y no de la seguridad del servidor.

---

# 41. Valor como proyecto de portfolio

Este proyecto puede demostrar bastante más que un CRUD.

Áreas demostrables:

### Frontend

- Next.js.
- React.
- TypeScript.
- State management.
- UX de datos sensibles.

### Backend

- PostgreSQL.
- Supabase.
- RLS.
- Auth.
- Relaciones multiusuario.

### Security

- Zero-knowledge architecture.
- Envelope encryption.
- AES-GCM.
- Argon2id.
- Key hierarchy.
- Threat modeling.
- Secure session lifecycle.
- XSS mitigation.

### Arquitectura

- Separación Auth / Cryptographic Authorization.
- Multi-tenant system.
- Shared vaults.
- Granular permissions.
- Key rotation.
- Recovery design.

Esto convierte al proyecto en una pieza considerablemente más fuerte para portfolio que una aplicación CRUD tradicional.

---

# 42. Roadmap recomendado

## Fase 1 — Diseño

Antes de construir pantallas:

- Definir threat model.
- Definir key hierarchy.
- Definir esquema SQL.
- Definir políticas RLS.
- Definir formato del encrypted payload.
- Definir crypto versioning.

## Fase 2 — Crypto Proof of Concept

Crear un pequeño módulo aislado capaz de:

```text
master password
↓
Argon2id
↓
KEK
↓
encrypted UserMasterKey
↓
VaultKey
↓
AES-GCM credential
```

Validar:

- encrypt/decrypt.
- passwords incorrectas.
- nonces.
- serialización.
- cambio de Master Password.

## Fase 3 — Supabase

Crear:

- proyecto.
- migraciones.
- tablas.
- relaciones.
- RLS.
- Auth.

## Fase 4 — Vault personal

Implementar:

- unlock.
- lock.
- CRUD.
- búsqueda.
- clipboard.
- auto-lock.

## Fase 5 — Familia

Implementar:

- families.
- memberships.
- shared vaults.
- invitations.
- permisos.

## Fase 6 — Hardening

- CSP.
- dependencia audit.
- security headers.
- rate limiting.
- logs.
- session policies.
- key lifecycle.
- tests criptográficos.

## Fase 7 — Portfolio

Crear documentación pública con:

- Diagrama de arquitectura.
- Threat model.
- Decisiones técnicas.
- Diseño zero-knowledge.
- Screenshots.
- Demo.
- Explicación de trade-offs.

---

# 43. Principio rector del proyecto

Cada decisión técnica debería poder responder correctamente esta pregunta:

> Si mañana alguien roba toda mi base de datos de Supabase, ¿puede leer las contraseñas?

La respuesta correcta debe ser:

**No.**

Y una segunda pregunta:

> Si alguien controla únicamente mi backend, ¿posee directamente las claves necesarias para descifrar la bóveda?

La respuesta también debe ser:

**No.**

Ese es el núcleo de la arquitectura.
