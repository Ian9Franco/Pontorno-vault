# Interfaz de bóvedas

## Dirección visual

La biblioteca toma la geometría de `public/ui1.jpg`, `ui2.jpg` y `ui3.jpg`:
bordes finos, marcas de esquina, paneles oscuros y acentos menta. No reutiliza
textos de las referencias. Los adornos son decorativos y no representan análisis
de seguridad. Los indicadores describen cifrado, bloqueo por inactividad y
almacenamiento local o conectado; no prometen seguridad absoluta.

## Componentes y responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/VaultView.tsx` | Compone el dashboard, permisos y modales de bóveda. |
| `src/components/vault/VaultSelector.tsx` | Botones directos para las bóvedas disponibles, con nombre y cantidad de servicios. |
| `src/components/vault/SecurityStatus.tsx` | Muestra las protecciones implementadas y el modo de almacenamiento. |
| `src/components/vault/CredentialLibrary.tsx` | Búsqueda sobre toda la bóveda y paginación de 12 registros. |
| `src/components/vault/CredentialCard.tsx` | Copiar, revelar, detalles, edición y confirmación de eliminación. |
| `src/components/vault/dashboard.css` | Estilo acotado al dashboard y puntos de adaptación. |

Con dos bóvedas se muestran dos botones, sin selector desplegable. Si una demo
solo tiene una, se muestra únicamente esa bóveda. Las bóvedas adicionales
existentes siguen accesibles: el diseño no elimina ni oculta datos.

### Gestión, carga y movimiento

“Gestionar bóvedas” abre `ManageVaultsModal`: crear otra bóveda o eliminar una propia
con confirmación explícita y cantidad de contraseñas afectadas. La última bóveda
no se puede eliminar desde esta pantalla. “Editar actual” abre `EditVaultModal`
solo para la seleccionada y permite cambiar nombre y tipo, sin ofrecer eliminación.
`VaultFormFields` comparte campos y mensajes entre crear y editar.

`VaultDialog` usa un diálogo nativo para contener el foco, desactivar el fondo,
restaurar el foco al cerrar y responder a Escape. Mientras una escritura está en
curso, cerrar y enviar de nuevo quedan deshabilitados.

`VaultLoading` y `VaultSkeleton` representan inicialización y desbloqueo reales,
sin esperas decorativas ni porcentajes ficticios. La página mantiene montado el
formulario durante el desbloqueo y lo vuelve inerte bajo el preload: si falla,
conserva el mensaje de error. `app/loading.tsx` reutiliza la presentación para la ruta.

`VaultObject` forma una bóveda 3D mediante seis planos CSS, perspectiva, puerta,
bisagras y sombra. Es decorativa y no anuncia que la sesión esté bloqueada.
El preload anima suavemente su orientación. `motion.css` contiene esta geometría,
modales, esqueletos y luces perimetrales: estas usan un gradiente enmascarado para
conservar el contorno y no interceptan pulsaciones. Solo la bóveda activa y las
tarjetas bajo foco o puntero animan sus bordes. Todas las animaciones respetan
`prefers-reduced-motion`. La paleta del preload toma menta y coral de
`public/preload-loading.jpg`; el coral queda reservado para acciones destructivas.

La grilla muestra tres columnas en escritorio, dos en tabletas y móviles desde
360 px, y una columna compacta en pantallas menores. Cada página contiene como
máximo 12 servicios. Buscar reinicia la página; eliminar el último registro de una
página ajusta la página visible. Los datos se filtran antes de paginar.

## Estado sensible y permisos

- La contraseña no se renderiza hasta que se pulsa mostrar. La búsqueda no examina
  contraseñas, pero conserva búsqueda por servicio, usuario, sitio y notas.
- Cambiar de bóveda desmonta la biblioteca y descarta secretos revelados, búsqueda
  y página. Cambiar búsqueda o página también desmonta las tarjetas anteriores.
- Copiar usa el helper de portapapeles existente y solo confirma una copia exitosa.
  Su limpieza automática depende de los permisos del navegador.
- READ permite consultar y copiar. WRITE y ADMIN habilitan editar credenciales;
  administrar la bóveda requiere propiedad. El contexto y las políticas RLS
  mantienen los controles independientes de los botones visibles.
- El bloqueo desmonta la vista y los formularios sensibles desde la página raíz.

## Contexto dividido

`VaultContext.tsx` publica la API que ya consumía la UI. Las referencias de claves
no se exponen a los componentes. La extracción conserva los flujos existentes:

| Módulo en `src/context/vault` | Responsabilidad |
| --- | --- |
| `types.ts` | Modelos públicos y formato del almacenamiento cifrado. |
| `useVaultSession.ts` | Estado, suscripciones de autenticación y bloqueo por inactividad. |
| `useVaultDecryption.ts` | Carga de bóvedas autorizadas y descifrado de registros. |
| `createAuthActions.ts` | Registro, inicio de sesión, desbloqueo y cierre de sesión. |
| `createMutationActions.ts` | Escrituras con controles de permiso y confirmación de persistencia. |

Mantener cada archivo de componentes y contexto por debajo de 400 líneas.
Separar por responsabilidad, no comprimir líneas para cumplir el límite. Los
comentarios explican decisiones, límites de seguridad y ciclos de vida; los
nombres y tipos describen las operaciones simples.

## Verificación

Ejecutar `npm test`, `npm run typecheck` y `npm run build`. La suite incluye
permisos de lectura/escritura, búsqueda fuera de la primera página, ausencia de
secretos en HTML inicial, límite de 12 tarjetas y selección sin desplegables.
En navegador comprobar 320, 390 y 1280 px, búsqueda, copia, páginas, cambio de
bóveda, bloqueo y reapertura. Usar datos ficticios en una demo aislada.
