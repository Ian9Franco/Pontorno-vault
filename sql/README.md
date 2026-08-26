# Scripts SQL para Supabase — Family Vault

Esta carpeta contiene todos los scripts SQL necesarios para inicializar la base de datos de **Family Vault** en Supabase con soporte completo para **Row Level Security (RLS)** y arquitectura **Zero-Knowledge**.

---

## Opción 1: Ejecutar Todo en 1 Solo Paso (Recomendado)

1. Abre tu panel de control en [Supabase](https://supabase.com/dashboard).
2. Selecciona tu proyecto y ve a la sección **SQL Editor** (en el menú lateral izquierdo).
3. Crea una **New Query**.
4. Copia y pega el contenido completo de:
   👉 [`sql/00_all_tables_complete.sql`](./00_all_tables_complete.sql)
5. Haz clic en **Run** (o presiona `Ctrl + Enter` / `Cmd + Enter`).

---

## Opción 2: Ejecutar Tabla por Tabla

Si prefieres ejecutar los scripts de forma modular e incremental, cópialos y ejecútalos en este orden exacto:

1. [`01_profiles.sql`](./01_profiles.sql) — Perfiles públicos vinculados a `auth.users`.
2. [`02_user_crypto.sql`](./02_user_crypto.sql) — Metadatos de derivación Argon2id y envoltura de `UserMasterKey`.
3. [`03_families.sql`](./03_families.sql) — Workspaces familiares y roles de membresía.
4. [`04_vaults.sql`](./04_vaults.sql) — Bóvedas personales y compartidas con `VaultKey` envuelta.
5. [`05_credentials.sql`](./05_credentials.sql) — Credenciales cifradas con AES-256-GCM y permisos de lectura/escritura.

---

## Tablas Creadas y Políticas RLS

| Tabla | Propósito | Regla de Acceso Criptográfico |
| :--- | :--- | :--- |
| `profiles` | Display name y avatar | Solo lectura/edición por el propio usuario (`auth.uid() = id`). |
| `user_crypto` | Salt, parámetros Argon2id y `UserMasterKey` cifrada | Solo lectura e inserción por el propietario. |
| `families` | Espacios compartidos familiares | Visible solo por miembros confirmados de la familia. |
| `family_members` | Vínculo usuario $\leftrightarrow$ familia con rol (`OWNER`, `ADMIN`, `MEMBER`) | Visible entre miembros del mismo grupo familiar. |
| `vaults` | Bóvedas (`PERSONAL` / `SHARED`) | Solo visible para usuarios autorizados en `vault_members`. |
| `vault_members` | Contiene la `VaultKey` envuelta individualmente para cada usuario | Solo el propio usuario o administradores de la bóveda pueden acceder a su clave envuelta. |
| `credentials` | Ciphertext en Base64 (`encrypted_payload` + `nonce`) | Solo miembros con acceso a la bóveda pueden leer; solo `WRITE` o `ADMIN` pueden crear/editar/eliminar. |
