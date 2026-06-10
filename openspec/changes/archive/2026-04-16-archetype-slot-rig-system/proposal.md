## Why

El formato JSON actual mezcla geometría de piezas, datos de personaje, huesos y animaciones en una sola estructura plana. Esto hace difícil pedir modelos a un LLM (el LLM tendría que generar bones y curvas de animación), impide reutilizar esqueletos entre personajes distintos, y acopla el rig al modelo de forma que no se pueden importar animaciones de forma independiente. Se necesita una separación clara al estilo de motores 3D modernos (mismo esqueleto → distintas mallas → distintas animaciones).

## What Changes

- **Nuevo modelo de datos `CharacterModel`** con `archetype`, `slots` (listas de piezas agrupadas por parte del cuerpo/vehículo), `animationProfile` y `skeletonId` opcional.
- **Sistema de arquetipos** (`HUMANOID`, `BIRD`, `CAR`, `PROP`) que define qué slots están disponibles para cada tipo genérico.
- **Esqueletos como recursos independientes** (`SkeletonDefinition`): jerarquía de bones y animaciones separadas del modelo geométrico, identificados por `skeletonId`.
- **Perfiles de animación** (`AnimationProfile`): conjuntos de animaciones predefinidas referenciados por nombre, sin que el LLM tenga que generar curvas.
- **Binding slot→bones** por defecto y personalizable por modelo.
- **Capa de compatibilidad**: importación de JSON en formato viejo mapeado automáticamente al nuevo `CharacterModel`.
- **Importación de animaciones sueltas** desenlazadas del modelo completo.
- **Nueva UI "Rig/Animaciones"**: panel con modelo a la izquierda y esqueleto a la derecha, selector de `skeletonId`, tabla de binding slot→bones con resaltado visual, y reproducción de animaciones con vista dual (modelo + esqueleto).
- Se mantiene la vista actual de overlay de bones sobre el modelo.

## Capabilities

### New Capabilities
- `archetype-system`: Define arquetipos (HUMANOID, BIRD, CAR, PROP) con sus slots disponibles y reglas de mapeo.
- `character-model-format`: Nuevo formato `CharacterModel` con archetype, slots, animationProfile, skeletonId. Incluye conversión desde/hacia el formato viejo.
- `skeleton-registry`: Registro de esqueletos reutilizables por arquetipo, con jerarquía de bones, animaciones y bindings slot→bones por defecto.
- `animation-profile`: Sistema de perfiles de animación referenciados por nombre, con parámetros de estilo opcionales.
- `rig-animation-ui`: Panel UI para gestionar skeleton y animaciones: vista dual modelo/esqueleto, selector de skeletonId, tabla de binding slot→bones, reproducción de animaciones con resaltado.

### Modified Capabilities
- `json-object-import`: Debe detectar si el JSON usa el formato viejo (plano con `pieces`) o el nuevo (`CharacterModel` con `slots`), y mapearlo internamente.
- `scene-persistence`: Serialización/deserialización debe soportar el nuevo formato `CharacterModel` además del formato existente.
- `template-registry`: Los templates de personajes deben poder usar el nuevo formato `CharacterModel`.
- `glb-export`: La exportación GLB debe incluir skeleton y animaciones del perfil asignado cuando existe binding.

## Impact

- **Archivos principales afectados**: `state.js`, `json-import.js`, `persistence.js`, `templates.js`, `template-registry.js`, `animation.js`, `animation-import.js`, `scene.js`, `export.js`, `ui.js`, `main.js`, `index.html`.
- **Nuevos módulos**: `archetype-system.js`, `skeleton-registry.js`, `animation-profiles.js`, `rig-ui.js`.
- **Datos nuevos**: esqueletos JSON en `src/data/skeletons/`, perfiles de animación, templates de ejemplo en nuevo formato (`CharacterModel`).
- **Sin dependencias externas nuevas** (todo se construye sobre Three.js existente).
- **Compatibilidad hacia atrás**: el formato viejo de JSON seguirá funcionando; se convierte internamente al nuevo modelo.
