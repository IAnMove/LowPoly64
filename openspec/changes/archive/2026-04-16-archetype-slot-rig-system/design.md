## Context

Retrovisor es un editor 3D basado en Three.js que genera modelos low-poly a partir de piezas geométricas básicas (cubos, prismas, cilindros, etc.). Los modelos se definen como JSON con un array `pieces` donde cada pieza tiene geometría, color, posición y opcionalmente un `parent` (para crear jerarquías/bones). Las animaciones se definen inline como tracks que referencian piezas por nombre.

**Estado actual:**
- `json-import.js`: parsea JSON con formato `{ name, pieces[], animations[] }`.
- `persistence.js`: serializa/deserializa la escena completa (formato interno con tipos `pivot`/`group`/`mesh`).
- `templates.js` + `template-registry.js`: carga templates JSON desde `src/data/templates/` con el mismo formato de pieces.
- `animation.js` + `animation-import.js`: compila definiciones de animación en `AnimationClip` de Three.js.
- `scene.js`: visualización de bones como esferas cyan conectadas por líneas sobre los PivotGroups.
- `export.js`: exporta a GLB incluyendo animaciones.

**Restricción principal:** No romper la funcionalidad existente. Los JSON viejos deben seguir cargando.

## Goals / Non-Goals

**Goals:**
- Separar modelo geométrico (slots/piezas) de esqueleto (bones/animaciones) para que un LLM solo genere geometría.
- Introducir arquetipos que definan qué slots están disponibles según el tipo de objeto.
- Permitir reutilizar esqueletos y animaciones entre modelos distintos del mismo arquetipo.
- UI para gestionar binding slot→bones y previsualizar animaciones con vista dual.
- Compatibilidad total con el formato JSON viejo.

**Non-Goals:**
- No se implementa un editor de animaciones por keyframe (las animaciones se definen externamente).
- No se implementa IK (inverse kinematics).
- No se cambia el formato interno de `persistence.js` (serialización de escena) en esta fase; solo se extiende.
- No se implementa retargeting de animaciones entre esqueletos de distinto arquetipo.
- No se crea un sistema de plugins o extensiones.

## Decisions

### 1. Modelo de datos: CharacterModel como capa sobre el formato existente

**Decisión:** `CharacterModel` es una interfaz lógica que se convierte al formato interno existente (`pieces[]` + `animations[]`) al cargar. No reemplaza el modelo interno de Three.js.

**Alternativa considerada:** Reescribir el modelo interno para usar slots nativamente. Descartada porque requeriría reescribir `persistence.js`, `export.js`, `scene.js` y toda la manipulación de objetos. Demasiado invasivo.

**Rationale:** Al mantener la conversión en la capa de importación, el editor sigue funcionando exactamente igual internamente. Solo `json-import.js` y los templates necesitan conocer el nuevo formato. El `userData` de cada grupo almacenará metadata del CharacterModel (archetype, slotBindings, etc.) para la UI de rig.

### 2. Arquetipos como registros estáticos

**Decisión:** Los arquetipos se definen como un registro estático en `archetype-system.js`, un objeto JS que mapea cada archetype a sus slots disponibles. No se usa base de datos ni ficheros externos.

**Alternativa:** Definir arquetipos en JSON externo. Descartada porque añade complejidad de carga sin beneficio real — los arquetipos cambian raramente.

### 3. Esqueletos como ficheros JSON en `src/data/skeletons/`

**Decisión:** Cada esqueleto es un fichero JSON en `src/data/skeletons/` que define: `id`, `archetype`, `bones[]` (jerarquía), `defaultBindings` (slot→bones) y `animations[]`. Se cargan via `import.meta.glob` igual que los templates.

**Rationale:** Consistente con el patrón existente de templates. Permite añadir esqueletos sin tocar código. Los esqueletos se pueden importar también por separado desde la UI.

### 4. Perfiles de animación como subconjuntos de un esqueleto

**Decisión:** Un `AnimationProfile` es un objeto que referencia un `skeletonId` y lista qué animaciones de ese esqueleto usar, con parámetros de estilo opcionales. Se define en `src/data/animation-profiles/` como JSON.

**Alternativa:** Meter los perfiles dentro del JSON del esqueleto. Descartada porque un esqueleto puede tener muchas animaciones y distintos perfiles seleccionan subconjuntos distintos (ej: espadachín vs arquero usan el mismo esqueleto HUMANOID_DEFAULT pero animaciones distintas).

### 5. Binding slot→bones almacenado en userData del grupo

**Decisión:** Cuando se carga un `CharacterModel`, el binding se almacena en `group.userData.slotBindings` como `Map<SlotId, string[]>`. El binding por defecto viene del esqueleto; se puede sobrescribir por modelo. La UI de rig lee/escribe este userData.

### 6. UI de Rig como modal/panel adicional, no reemplazo

**Decisión:** La UI de rig/animaciones se implementa como un modal overlay (similar al import modal existente) que se abre desde un botón en el panel de propiedades cuando un grupo con archetype está seleccionado. Contiene dos viewports Three.js side-by-side.

**Alternativa:** Panel integrado en el layout principal. Descartada porque el layout actual ya está denso y un modal permite vistas 3D más grandes sin redimensionar todo.

### 7. Conversión de formato viejo

**Decisión:** En `json-import.js`, si el JSON tiene `pieces[]` sin `archetype`/`slots`, se importa con el flujo actual sin cambios. Si tiene `archetype` y `slots`, se convierte a `pieces[]` expandiendo los slots y se aplica el esqueleto correspondiente. La detección es simple: `if (data.archetype && data.slots)`.

## Risks / Trade-offs

- **[Complejidad de la UI dual]** → Dos viewports Three.js simultáneos pueden impactar rendimiento en hardware bajo. **Mitigación**: Los viewports del modal solo se crean al abrir el modal y se destruyen al cerrar. Se usan renderers separados con resolución reducida.

- **[Divergencia formato viejo/nuevo]** → Mantener dos formatos de entrada aumenta la superficie de bugs. **Mitigación**: El formato viejo se congela (no se añaden features nuevas), y la conversión se concentra en una única función bien testeada.

- **[Binding incorrecto slot→bones]** → Si un slot no tiene bones mapeados, las piezas de ese slot no se animarán. **Mitigación**: Binding por defecto siempre presente para cada arquetipo/esqueleto. La UI resalta slots sin binding en rojo.

- **[Animaciones incompatibles entre esqueletos]** → Un perfil de animación creado para un esqueleto no funcionará con otro. **Mitigación**: Los perfiles referencian explícitamente su `skeletonId`; la UI filtra perfiles incompatibles.
