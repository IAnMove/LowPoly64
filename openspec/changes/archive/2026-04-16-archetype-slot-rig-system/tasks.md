## 1. Modelo de datos — Sistema de arquetipos

- [x] 1.1 Crear `src/modules/archetype-system.js` con el registro estático de arquetipos (HUMANOID, BIRD, CAR, PROP) y sus slots disponibles. Exportar funciones `getArchetype(id)`, `getSlots(archetypeId)`, `registerArchetype(id, slots)`, y `validateSlot(archetypeId, slotId)`.
- [x] 1.2 Definir los tipos/constantes: lista de `SlotId` conocidos, lista de `Archetype` conocidos, y el mapa `ARCHETYPE_SLOTS` que asocia cada arquetipo a sus slots.
- [x] 1.3 Crear función `validateCharacterModel(data)` que valide un JSON de tipo CharacterModel: comprueba que `archetype` existe, que cada `slotId` es válido para ese arquetipo, y que cada pieza tiene los campos requeridos (`template`, `name`, `size`, `offset`, `material`).

## 2. Modelo de datos — Formato CharacterModel y conversión

- [x] 2.1 Crear `src/modules/character-model.js` con la función `characterModelToPieces(characterModel)` que convierte un `CharacterModel` (con `archetype`, `slots[]`) al formato interno plano `pieces[]` usado por `buildGroupFromDefinition`. Mapear `template`→`geometry.type` (CUBE→cube, PRISM→wedge, PLANE→plane, CYLINDER→cylinder), `size`→`params` (width/height/depth), `offset`→`position`, `material`→`color`.
- [x] 2.2 En la misma función, generar los campos `parent` y `pivot` automáticamente según la jerarquía implícita del arquetipo (ej: piezas de ARM_L se hacen hijas de TORSO en humanoides) o preservar los `parent`/`pivot` explícitos que vengan en las piezas.
- [x] 2.3 Crear función `piecesToCharacterModel(pieces, metadata)` que convierte el formato interno plano `pieces[]` de vuelta a CharacterModel, usando la metadata de `userData` (archetype, slotMap) para reconstruir los slots.
- [x] 2.4 Crear función `detectFormat(data)` que retorne `"character-model"` si el JSON tiene `archetype` y `slots`, `"legacy"` si tiene `pieces[]` sin `archetype`, o `"animation"` si solo tiene `tracks`/`animations`.

## 3. Modelo de datos — Registro de esqueletos

- [x] 3.1 Crear directorio `src/data/skeletons/` y fichero `humanoid_default.json` con: `id: "HUMANOID_DEFAULT"`, `archetype: "HUMANOID"`, `bones[]` (jerarquía: ROOT→SPINE→HEAD, ARM_L_UPPER→ARM_L_LOWER→HAND_L, ARM_R_UPPER→ARM_R_LOWER→HAND_R, LEG_L_UPPER→LEG_L_LOWER→FOOT_L, LEG_R_UPPER→LEG_R_LOWER→FOOT_R), `defaultBindings` (HEAD→[HEAD], TORSO→[SPINE], ARM_L→[ARM_L_UPPER,ARM_L_LOWER,HAND_L], ARM_R→[ARM_R_UPPER,ARM_R_LOWER,HAND_R], LEG_L→[LEG_L_UPPER,LEG_L_LOWER,FOOT_L], LEG_R→[LEG_R_UPPER,LEG_R_LOWER,FOOT_R], WEAPON_MAIN→[HAND_R], WEAPON_SECONDARY→[HAND_L]).
- [x] 3.2 Crear ficheros de esqueleto para los demás arquetipos: `bird_simple.json` (BODY, HEAD, LEG_L, LEG_R, WING_L, WING_R, TAIL con bones correspondientes), `car_simple.json` (BODY→ROOT, wheels→bone por rueda).
- [x] 3.3 Crear `src/modules/skeleton-registry.js` que cargue esqueletos desde `src/data/skeletons/` vía `import.meta.glob`, los normalice y los exponga en un registro consultable. Exportar `getSkeletonsByArchetype(archetype)`, `getSkeletonById(id)`, `getDefaultSkeleton(archetype)`, `registerSkeleton(def)`.
- [x] 3.4 Añadir animaciones básicas (idle, walk) al esqueleto `humanoid_default.json` como tracks que referencian los bones del esqueleto.

## 4. Modelo de datos — Perfiles de animación

- [x] 4.1 Crear directorio `src/data/animation-profiles/` y ficheros JSON para los perfiles iniciales: `humanoid_swordsman.json` (skeletonId: HUMANOID_DEFAULT, animations: [idle, walk, run, attack, hurt, die]), `humanoid_archer.json` (skeletonId: HUMANOID_DEFAULT, animations: [idle, walk, run, bow_draw, bow_shoot, hurt, die]), `bird_idle_walk.json`, `car_roll.json`.
- [x] 4.2 Crear `src/modules/animation-profiles.js` que cargue perfiles desde `src/data/animation-profiles/` vía `import.meta.glob`. Exportar `getProfileById(id)`, `getProfilesBySkeletonId(skeletonId)`, `getProfilesByArchetype(archetype)`.
- [x] 4.3 Crear función `resolveAnimationProfile(profileId, skeletonRegistry)` que dado un profileId, busque el perfil, obtenga el esqueleto referenciado, filtre sus animaciones a las listadas en el perfil, y retorne los clips compilables.

## 5. Compatibilidad — Integración con json-import

- [x] 5.1 Modificar `json-import.js` → `handleImportSubmit()`: añadir detección de formato usando `detectFormat(data)`. Si es `"character-model"`, llamar a una nueva función `importCharacterModel(data)` en vez de `importObjectFromJSON()`.
- [x] 5.2 Crear función `importCharacterModel(data)` en `json-import.js` (o en `character-model.js`): validar con `validateCharacterModel`, convertir con `characterModelToPieces`, llamar a `buildGroupFromDefinition`, aplicar metadata al group.userData (archetype, slotMap, skeletonId, animationProfile, slotBindings), resolver y aplicar animaciones del perfil.
- [x] 5.3 Verificar que la importación de JSON viejo (formato `pieces[]` sin `archetype`) sigue funcionando exactamente igual — no se modifica el flujo existente.
- [x] 5.4 Añadir soporte para importar esqueletos sueltos (JSON con `bones` y `defaultBindings`): en `handleImportSubmit`, si `detectFormat` retorna un formato de esqueleto, registrarlo en el skeleton-registry y mostrar toast de confirmación.

## 6. Compatibilidad — Integración con persistence

- [x] 6.1 Modificar `persistence.js` → `serializeObject()`: cuando un grupo tiene `userData.archetype`, incluir campos adicionales en la serialización: `archetype`, `slotMap`, `animationProfile`, `skeletonId`, `slotBindings`.
- [x] 6.2 Modificar `persistence.js` → `deserializeObject()`: al reconstruir un grupo, si los datos serializados incluyen `archetype`, restaurar esos campos en `userData`.
- [x] 6.3 Modificar `serializeGroupAsImportJSON()`: añadir parámetro opcional `{ format: 'character-model' | 'legacy' }`. Si `format === 'character-model'` y el grupo tiene metadata de archetype, producir JSON en formato CharacterModel.

## 7. Compatibilidad — Integración con templates y export

- [x] 7.1 Modificar `template-registry.js` → `normalizeTemplateDefinition()`: detectar si el template JSON tiene formato CharacterModel (`archetype` + `slots`). Si es así, convertir a pieces internamente y almacenar metadata.
- [x] 7.2 Modificar `templates.js` → `addTemplate()`: si el template normalizado tiene metadata de archetype, pasarla al grupo creado por `buildGroupFromDefinition`, y resolver esqueleto/animaciones.
- [x] 7.3 Crear templates de ejemplo en formato CharacterModel: `psx_warrior_v2.json` (HUMANOID con slots) como prueba de concepto del nuevo formato.
- [x] 7.4 Modificar `export.js` → `prepareForExport()`: si un grupo tiene `userData.skeletonId` y `userData.animationProfile`, obtener las animaciones del perfil desde el skeleton-registry y compilarlas como clips adicionales para la exportación GLB.

## 8. Datos de ejemplo y validación

- [x] 8.1 Crear template de ejemplo: humanoide espadachín en formato CharacterModel (`archetype: "HUMANOID"`, slots HEAD/TORSO/ARM_L/ARM_R/LEG_L/LEG_R/WEAPON_MAIN con espada, `animationProfile: "HUMANOID_SWORDSMAN"`).
- [x] 8.2 Crear template de ejemplo: humanoide arquero (igual que espadachín pero con arco en WEAPON_MAIN, carcaj en WEAPON_SECONDARY, `animationProfile: "HUMANOID_ARCHER"`).
- [x] 8.3 Crear template de ejemplo: gallina (`archetype: "BIRD"`, slots BODY/HEAD/LEG_L/LEG_R/WING_L/WING_R/TAIL, `animationProfile: "BIRD_IDLE_WALK"`).
- [x] 8.4 Crear template de ejemplo: coche (`archetype: "CAR"`, slots BODY/WHEEL_FL/WHEEL_FR/WHEEL_RL/WHEEL_RR, `animationProfile: "CAR_ROLL"`).
- [x] 8.5 Verificar importación round-trip: importar cada ejemplo → exportar como JSON → re-importar → verificar que la estructura es equivalente.

## 9. UI — Panel de Rig/Animaciones (estructura base)

- [x] 9.1 Crear `src/modules/rig-ui.js` con la función `openRigPanel(group)` que abre un modal overlay. El modal debe contener: contenedor izquierdo (viewport modelo), contenedor derecho (viewport esqueleto), barra superior con selector de skeletonId y botones, zona inferior con tabla de binding y lista de animaciones.
- [x] 9.2 Crear el HTML del modal en `index.html`: div con id `rig-panel-modal` con layout flex, dos canvas para los viewports, dropdown para skeleton, tabla para bindings, lista para animaciones. Estilizar con las mismas clases retro que usa el resto de la UI.
- [x] 9.3 Implementar inicialización de los dos renderers Three.js independientes dentro del modal (uno para modelo, otro para esqueleto), cada uno con su propia cámara, OrbitControls, y luces. Los renderers se crean al abrir el modal y se destruyen al cerrar.
- [x] 9.4 Añadir botón "Rig / Animaciones" al panel de propiedades en `ui.js` → `updatePropertiesPanel()`, visible solo cuando `mesh.isGroup && mesh.userData.archetype`. Al hacer clic, llamar a `openRigPanel(group)`.

## 10. UI — Panel de Rig (selector de esqueleto y bindings)

- [x] 10.1 Implementar el dropdown de selección de `skeletonId`: al abrir el panel, consultar `getSkeletonsByArchetype(archetype)` y poblar el dropdown. Al cambiar la selección, actualizar el viewport derecho con el nuevo esqueleto y resetear bindings a los defaults del nuevo esqueleto.
- [x] 10.2 Renderizar el esqueleto seleccionado en el viewport derecho: crear esferas para cada bone y líneas para las conexiones padre→hijo, similar a la visualización existente en `scene.js` pero en un renderer separado.
- [x] 10.3 Renderizar una copia del modelo (las piezas geométricas) en el viewport izquierdo: clonar el grupo del modelo y añadirlo a la escena del viewport izquierdo.
- [x] 10.4 Implementar la tabla de binding slot→bones: listar todos los slots del archetype, para cada uno mostrar los bones asignados. Permitir hacer clic en un slot para seleccionarlo, y asignar/desasignar bones mediante checkboxes o selector múltiple.
- [x] 10.5 Al hacer clic en un slot en la tabla, resaltar las piezas de ese slot en el viewport izquierdo (cambiar emissive o material a color destacado). Al hacer clic en un bone en la tabla/viewport, resaltarlo en el viewport derecho.
- [x] 10.6 Guardar los bindings modificados en `group.userData.slotBindings` al cerrar el panel o al cambiar bindings.

## 11. UI — Panel de Rig (reproducción de animaciones)

- [x] 11.1 Implementar lista de animaciones disponibles en el panel: listar las animaciones del esqueleto seleccionado (filtradas por el perfil de animación si existe). Cada animación tiene un botón play.
- [x] 11.2 Al hacer clic en play de una animación: compilar el clip, crear un AnimationMixer para el modelo del viewport izquierdo y otro para el esqueleto del viewport derecho, y reproducir ambos en sincronía.
- [x] 11.3 Implementar loop de render para los viewports del modal: usar `requestAnimationFrame` independiente que actualice ambos mixers y renderers mientras el modal está abierto. Detener al cerrar.
- [x] 11.4 Durante la reproducción, si hay un slot/bone seleccionado, mantener el highlight siguiendo la posición animada.
- [x] 11.5 Añadir botones de control: play/pause, stop, y selector de animación. Mostrar barra de progreso de la animación.

## 12. UI — Integración y estado global

- [x] 12.1 En `state.js`: añadir campos para el estado del panel rig si es necesario (ej: `rigPanelOpen`, `rigPanelGroup`).
- [x] 12.2 En `main.js`: importar y registrar el módulo `rig-ui.js`, exponer `openRigPanel` en window si es necesario para los botones HTML.
- [x] 12.3 Actualizar `i18n.js` con las claves de traducción para todos los textos nuevos de la UI del panel rig (botones, labels, mensajes de error, etc.).
- [x] 12.4 Actualizar `ask.md` y `ask-animation.md` con la documentación del nuevo formato CharacterModel como formato preferido para modelos de personajes/vehículos.
- [x] 12.5 Verificar que la vista actual de bones overlay (cyan spheres en el viewport principal) sigue funcionando sin cambios.
