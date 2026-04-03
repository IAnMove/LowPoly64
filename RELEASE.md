# RELEASE NOTES — Retrovisor 3D

Registro de cambios por versión. Formato: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — rama `feature/improve_quality`

### Nuevos sistemas

#### Sistema de Arquetipos y Rigs
- **Archetype System** (`src/modules/archetype-system.js`): define arquetipos (HUMANOID, BIRD, CAR, PROP) y sus slots. Soporte para registrar arquetipos nuevos en tiempo de ejecución vía `registerArchetype()`.
- **Skeleton Registry** (`src/modules/skeleton-registry.js`): carga automáticamente todos los JSONs de `src/data/skeletons/` via glob. API: `getSkeletonById`, `getSkeletonsByArchetype`, `registerSkeleton` (runtime).
- **Animation Profiles** (`src/modules/animation-profiles.js`): define subsets de animaciones por "rol" (espadachín, arquero, etc.). Carga automática desde `src/data/animation-profiles/`. `registerProfile` permite importar perfiles en runtime.
- **Character Model (CM)** (`src/modules/character-model.js`): formato JSON para modelos geométricos vinculados a un rig. Campos: `name`, `archetype`, `animationProfile`, `skeletonId`, `slots[]`. Detección automática en Import JSON.
- **RIG Panel** (`src/modules/rig-ui.js`): panel de pantalla completa con dos viewports (modelo + esqueleto) para previsualizar y editar bindings. Animaciones via FK manual (sin AnimationMixer).

#### Sistema de Efectos Retro / PSX
- **Retro Effects** (`src/modules/retro-effects.js`): filtros visuales de estilo PSX aplicados en post-proceso. Toggles: PSX Mode, Vertex Jitter, Dithering, Low Res, Affine Texture. Son efectos de pantalla, no se exportan al GLB.

#### Otros módulos nuevos
- **Vertex Colors** (`src/modules/vertex-colors.js`): soporte para colores por vértice en piezas.
- **Custom Geometries** (`src/modules/custom-geometries.js`): geometrías personalizadas con `vertices` y `faces` triangulares.
- **Prompt Generator** (`src/modules/prompt-generator.js`): genera prompts LLM para crear CharacterModels y Skeletons completos, incluyendo posiciones de bones en espacio mundo, slots, reglas de posicionamiento, y instrucciones de instalación.

---

### Nuevos datos

#### Esqueletos (`src/data/skeletons/`)
| Archivo | Arquetipo | Bones | Animaciones |
|---|---|---|---|
| `humanoid_default.json` | HUMANOID | 15 | idle, walk, run, attack, hurt, die, bow_draw, bow_shoot |
| `bird_simple.json` | BIRD | 8 | idle, walk |
| `car_simple.json` | CAR | 5 | idle, roll |

#### Perfiles de animación (`src/data/animation-profiles/`)
| Archivo | Skeleton | Animaciones expuestas |
|---|---|---|
| `humanoid_swordsman.json` | HUMANOID_DEFAULT | idle, walk, run, attack, hurt, die |
| `humanoid_archer.json` | HUMANOID_DEFAULT | idle, walk, run, bow_draw, bow_shoot |
| `bird_idle_walk.json` | BIRD_SIMPLE | idle, walk |
| `car_roll.json` | CAR_SIMPLE | idle, roll |

#### Templates CharacterModel (`src/data/templates/characters/`)
- `swordsman_cm.json` — espadachín HUMANOID con perfil `HUMANOID_SWORDSMAN`
- `archer_cm.json` — arquero HUMANOID con perfil `HUMANOID_ARCHER`
- `chicken_cm.json` — pollo BIRD con perfil `BIRD_IDLE_WALK`
- `psx_warrior.json` — guerrero PSX (objeto legacy con animaciones propias)

#### Templates prop (`src/data/templates/props/`)
- `car_cm.json` — coche CAR con perfil `CAR_ROLL`

---

### Nuevas funciones de UI

#### Panel izquierdo
- **Sección ARQUETIPOS**: botones HUMANOID / AVE / VEHÍCULO que cargan el template CM por defecto del arquetipo y abren el RIG panel automáticamente.
- **Botón PROMPT LLM**: abre el generador de prompts para LLMs.

#### Generador de Prompts (modal)
Dos pestañas:
- **MODELO (CM)**: genera prompt para que un LLM cree un CharacterModel JSON listo para importar. Selección de esqueleto + perfil de animación + descripción libre. Incluye posiciones de bones en espacio mundo y reglas de posicionamiento.
- **ESQUELETO / RIG**: genera prompt para que un LLM cree un Skeleton JSON completo (bones, jerarquía, defaultBindings, animaciones). Soporte para arquetipos existentes o nuevos. Incluye instrucciones de instalación.

#### RIG Panel (botón en panel de propiedades)
- Accesible para **cualquier grupo** (con o sin rig asignado previamente).
- Si el grupo no tiene arquetipo → abre el modal **ASIGNAR RIG** primero.
- Dos viewports: modelo (izquierda) + esqueleto (derecha), ambos con OrbitControls.
- **Bindings bidireccionales editables**:
  - **PIEZAS DEL MODELO** (magenta): checkboxes de todas las piezas → edita `slotMap`
  - **BONES DEL ESQUELETO** (cian): checkboxes de todos los bones → edita `slotBindings`
  - Click en el viewport 3D del modelo para asignar/desasignar pieza al slot activo
  - Highlights bidireccionales: seleccionar slot ilumina piezas en modelo y bones en esqueleto
- Selector de esqueleto en el header (filtra por arquetipo).
- Lista de animaciones con play en bucle (o una sola vez para non-loop).
- Barra de progreso de animación.
- **FK manual** para el viewport del esqueleto (sin AnimationMixer, interpolación directa).

#### Modal ASIGNAR RIG
- Nuevo modal para grupos sin arquetipo.
- Selectores: arquetipo → esqueleto (filtrado por arquetipo).
- Al confirmar: aplica `archetype`, `skeletonId`, `slotBindings` (defaultBindings del skeleton) y abre el RIG panel directamente.

#### Import JSON (modal)
- Sección inferior reemplazada: de "Importar Animación al grupo" → **"IMPORT SKELETON / ANIMATION PROFILE"**.
- Detección automática por estructura: `{ bones[] }` → skeleton, `{ skeletonId, animations[string] }` → perfil.
- Registro en runtime sin necesidad de rebuild.
- Botón LOAD .JSON para cargar desde archivo.

#### Banner de modo animación
- Movido del top fijo al footer para no solapar controles del panel.

---

### Cambios en módulos existentes

| Módulo | Cambio |
|---|---|
| `json-import.js` | Detección de formato `skeleton` y `character-model`. `handleArchetypeImportSubmit` para skeleton/perfil. |
| `materials.js` | Soporte vertex colors, opacity, face colors. |
| `persistence.js` | Serialización/deserialización de `userData.archetype`, `slotMap`, `slotBindings`, `animationProfile`. |
| `scene.js` | Luces adicionales, helpers de grid, soporte para grupos con archetype en raycast. |
| `selection.js` | Selección de grupos CM, highlight de slot activo. |
| `templates.js` | Carga de templates CM, construcción de grupos con `slotMap`. |
| `template-registry.js` | Auto-registro desde glob, soporte categorías. |
| `ui.js` | Botón RIG/ANIMATIONS visible para cualquier grupo (no solo arquetipos). Label dinámico: "RIG / ANIMATIONS" o "ASIGNAR RIG". |
| `i18n.js` | +40 claves: arquetipos, RIG panel, prompt generator, assign rig. |
| `state.js` | Campos: `rigPanelOpen`, `rigPanelGroup`. |
| `main.js` | Exports de funciones RIG, prompt generator, assign rig. `openArchetype()`. |

---

### Archivos nuevos
```
src/modules/animation-profiles.js
src/modules/archetype-system.js
src/modules/character-model.js
src/modules/custom-geometries.js
src/modules/prompt-generator.js
src/modules/retro-effects.js
src/modules/rig-ui.js
src/modules/skeleton-registry.js
src/modules/vertex-colors.js
src/data/skeletons/humanoid_default.json
src/data/skeletons/bird_simple.json
src/data/skeletons/car_simple.json
src/data/animation-profiles/humanoid_swordsman.json
src/data/animation-profiles/humanoid_archer.json
src/data/animation-profiles/bird_idle_walk.json
src/data/animation-profiles/car_roll.json
src/data/templates/characters/swordsman_cm.json
src/data/templates/characters/archer_cm.json
src/data/templates/characters/chicken_cm.json
src/data/templates/characters/psx_warrior.json
src/data/templates/props/car_cm.json
```

---

## [0.1.0] — commits anteriores al branch `feature/improve_quality`

Base del editor. Incluye:
- Escena 3D con Three.js, primitivas, selección, transformación
- Sistema de materiales, texturas, UV editor
- Agrupación, jerarquía, pivot por pieza
- Sistema de animaciones (keyframes, tracks, mixer)
- Importación/exportación JSON y GLB
- Persistencia en localStorage
- Templates de objetos (arquitectura, naturaleza, props, personajes, monstruos)
- Sistema de undo/redo
- Internacionalización ES/EN
- Help center
- Modo animación (pantalla dedicada)
- Vertex colors, opacity, face colors

---

## Cómo usar este archivo

- Cada PR o sesión de trabajo importante debe añadir entradas en `[Unreleased]`.
- Al hacer un release, renombrar `[Unreleased]` a `[X.Y.Z] — YYYY-MM-DD` y crear un nuevo bloque `[Unreleased]` vacío.
- Categorías: `Nuevos sistemas`, `Nuevos datos`, `Nuevas funciones de UI`, `Cambios`, `Fixes`, `Archivos nuevos/eliminados`.
