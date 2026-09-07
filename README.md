# Family Vault (Pontorno Vault) 🔐

> **Gestor de contraseñas y credenciales familiares de arquitectura Zero-Knowledge y Envelope Encryption.**

![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase)
![Web Crypto](https://img.shields.io/badge/Crypto-AES--256--GCM%20%2B%20Argon2id-emerald?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-12%2F12%20Passing-brightgreen?style=flat-square&logo=vitest)

---

## 🌟 Visión del Proyecto

**Family Vault** es una aplicación web moderna diseñada para almacenar, organizar y compartir de forma segura credenciales de servicios y suscripciones familiares bajo un estricto modelo **Zero-Knowledge**.

### El principio rector:
> **Ningún secreto necesario para descifrar una credencial abandona el dispositivo del usuario sin estar previamente cifrado.**
> 
> Si la base de datos de Supabase fuese completamente filtrada, el atacante solo obtendría *ciphertext*, nonces y metadatos públicos, siendo matemáticamente incapaz de leer las credenciales sin la contraseña maestra del usuario.

---

## 🛡️ Arquitectura Criptográfica & Envelope Encryption

El sistema no utiliza una única clave global ni deriva las credenciales directamente de la contraseña maestra. Implementa una **jerarquía de claves por envoltura (Envelope Encryption)**:

```text
               Master Password (Memoria del navegador)
                           + Salt (16 bytes CSPRNG)
                                   │
                                   ▼ [Argon2id WASM: 64MB, 3 iter, 4 hilos]
                      KEK (Key Encryption Key - 256 bits)
                                   │
                                   ▼ [AES-256-GCM Unwrap]
                   User Master Key (256 bits aleatoria)
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       Personal Vault Key (256b)      Shared Family Vault Key (256b)
                    │                             │
                    ▼ [AES-256-GCM Decrypt]        ▼ [AES-256-GCM Decrypt]
         Credenciales Personales       Credenciales Familiares Compartidas
```

### Propiedades Clave:
1. **Separación entre Autenticación y Autorización Criptográfica**:
   - **Supabase Auth**: Responde *"¿Quién eres?"* mediante cuenta y sesión.
   - **Bóveda Criptográfica**: Responde *"¿Tienes la llave para abrir los datos?"* únicamente en el cliente.
2. **Rotación de Contraseña Maestra sin Recifrado**:
   - Al cambiar la contraseña maestra, **únicamente se re-envuelve la `UserMasterKey` con la nueva `KEK`**.
   - No es necesario recifrar ninguna credencial ni ninguna clave de bóveda.
3. **Compartición Familiar Segura**:
   - No existe una "contraseña familiar compartida".
   - Cada bóveda compartida posee su propia `VaultKey` simétrica, la cual se envuelve y distribuye de forma independiente para la `UserMasterKey` de cada miembro autorizado.
4. **Protección de Metadatos Sensibles**:
   - El payload completo (`platform`, `username`, `password`, `url`, `notes`) se cifra dentro del `encrypted_payload`. Supabase nunca ve qué plataforma ni qué usuario almacenas.

---

## 🔬 Especificaciones Técnicas

| Componente | Algoritmo / Estándar | Parámetros |
| :--- | :--- | :--- |
| **KDF (Key Derivation)** | **Argon2id (WebAssembly)** | `memoryCost: 64MB`, `timeCost: 3`, `parallelism: 4`, `hashLength: 32 bytes` |
| **Cifrado Simétrico** | **AES-256-GCM** | `tagLength: 128 bits`, `IV / Nonce: 96 bits (CSPRNG)` vía `crypto.subtle` |
| **Generador de Entropía** | **Web Crypto CSPRNG** | `crypto.getRandomValues()` (nunca `Math.random()`) |
| **Auto-Lock de Sesión** | Temporizador en memoria | 5 min de inactividad $\to$ destrucción de `CryptoKey` en memoria RAM |
| **Base de Datos** | **PostgreSQL (Supabase)** | **Row Level Security (RLS)** estricto por membresía |

---

## 📁 Estructura del Proyecto

```text
├── sql/                                    # Scripts SQL y RLS para Supabase
│   ├── 00_all_tables_complete.sql          # Script All-in-One para Supabase SQL Editor
│   ├── 01_profiles.sql                     # Perfiles de usuario vinculados a auth.users
│   ├── 02_user_crypto.sql                  # Metadatos criptográficos (Salts, UserMasterKey envuelta)
│   ├── 03_families.sql                     # Grupos y membresías familiares (OWNER, ADMIN, MEMBER)
│   ├── 04_vaults.sql                       # Bóvedas personales y compartidas con VaultKey envuelta
│   └── 05_credentials.sql                  # Credenciales cifradas con AES-256-GCM
│
├── src/
│   ├── app/                                # Next.js 16 App Router
│   │   ├── globals.css                     # Tailwind CSS v4 & diseño dark
│   │   ├── layout.tsx                      # RootLayout con VaultProvider
│   │   └── page.tsx                        # Orquestación de vistas (Auth, Onboarding, Unlock, Vault)
│   │
│   ├── components/                         # Componentes de interfaz interactiva
│   │   ├── Navbar.tsx                      # Header con estado, auto-lock countdown y accesos rápidos
│   │   ├── AuthModal.tsx                   # Registro e inicio de sesión en Supabase
│   │   ├── OnboardingModal.tsx             # Configuración inicial de Contraseña Maestra (Argon2id)
│   │   ├── UnlockModal.tsx                 # Desbloqueo criptográfico en memoria
│   │   ├── VaultView.tsx                   # Vista principal de bóvedas, buscador y credenciales
│   │   ├── CredentialModal.tsx             # Modal para crear/editar credenciales cifradas
│   │   ├── PasswordGeneratorModal.tsx      # Generador de contraseñas y passphrases seguras
│   │   └── SettingsModal.tsx               # Rotación de contraseña maestra y ajuste de auto-lock
│   │
│   ├── context/
│   │   └── VaultContext.tsx                # Gestor de sesión criptográfica en memoria RAM
│   │
│   ├── lib/
│   │   ├── crypto/                         # Núcleo Criptográfico Zero-Knowledge
│   │   │   ├── argon.ts                    # Derivación KEK con Argon2id (WASM)
│   │   │   ├── aes.ts                      # Cifrado/descifrado autenticado AES-256-GCM
│   │   │   ├── keys.ts                     # Generación y envoltura de UserMasterKey
│   │   │   ├── vault.ts                    # Compartición de VaultKey y rotación de contraseñas
│   │   │   ├── serialization.ts            # Conversiones Base64, Hex, Buffer y UTF-8
│   │   │   ├── types.ts                    # Tipos del subsistema criptográfico
│   │   │   └── __tests__/crypto.test.ts    # Suite de pruebas unitarias criptográficas
│   │   │
│   │   ├── security/                       # Utilidades de seguridad
│   │   │   ├── generator.ts                # Generador seguro de contraseñas con CSPRNG
│   │   │   ├── clipboard.ts                # Portapapeles seguro con auto-clear
│   │   │   └── __tests__/generator.test.ts # Pruebas del generador y medidor de entropía
│   │   │
│   │   └── supabase/
│   │       ├── client.ts                   # Inicialización cliente Supabase
│   │       └── types.ts                    # Mapeo de tipos de base de datos
```

---

## 🚀 Inicio Rápido

### 1. Clonar el repositorio e instalar dependencias:
```bash
git clone https://github.com/Ian9Franco/Pontorno-vault.git
cd Pontorno-vault
npm install
```

### 2. Configurar la Base de Datos en Supabase:
1. Crea un proyecto en [Supabase](https://supabase.com).
2. Usa las migraciones de `supabase/migrations/` en orden. No ejecutes los scripts históricos de `sql/`: contienen políticas inseguras.
3. Para bases existentes y el alcance actual de sharing, sigue [Security Foundation](./supabase/SECURITY_FOUNDATION.md). La reconciliación de OTP y otros cambios históricos con las migraciones sigue pendiente.

### 3. Configurar variables de entorno:
Crea un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

### 4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias en **Vitest** que validan la solidez del núcleo criptográfico:

```bash
npm test
```

### Casos de prueba validados (12/12):
- [x] **Derivación KEK determinista**: Mismo password y salt producen idéntica clave de 256 bits; variaciones producen claves distintas.
- [x] **Round-trip AES-256-GCM**: Cifrado y descifrado íntegro de payloads de texto plano.
- [x] **Detección de manipulación (Tamper Resistance)**: Cualquier alteración en el ciphertext o tag de autenticación lanza un error inmediato.
- [x] **Flujo de desbloqueo**: Validación con contraseña maestra correcta y rechazo de contraseñas incorrectas.
- [x] **Envelope Encryption multiusuario (Shared Vault)**: Dos usuarios con distintas identidades criptográficas descifran los datos de la bóveda compartida.
- [x] **Rotación de Contraseña Maestra**: Cambio de contraseña sin modificar los registros de credenciales ni las `VaultKeys`.
- [x] **Generador seguro CSPRNG & Passphrases**: Entropía criptográfica y cálculo de fortaleza visual.

---

## 📄 Licencia

Desarrollado bajo licencia [ISC](./package.json).
