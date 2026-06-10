## Context

Retrovisor ya dispone de:

- moldes humanoides reutilizables en `src/data/templates/generated-character-molds.js`
- conversion `CharacterModel` -> piezas internas en `src/modules/viewport/character-model.js`
- sustitucion del slot `HEAD` con SVG inflado en `src/modules/svg/svg-head-integration.js`
- panel de rig, esqueleto `HUMANOID_DEFAULT` y exportacion GLB con perfiles de animacion

Eso significa que el problema no es generar un nuevo tipo de asset. El problema es ofrecer un flujo guiado para construir un humanoide desde rasgos predisenados sin romper el arquetipo ni el rig.

## Goals / Non-Goals

**Goals:**
- Crear un modo de avatar que combine cuerpo, cabeza y rasgos faciales desde presets curados.
- Mantener todos los resultados dentro del arquetipo `HUMANOID`.
- Generar una salida editable y exportable por el pipeline normal (`CharacterModel` + SVG head + animation profile).
- Permitir reabrir la ficha de un avatar ya creado despues de `SAVE`/`LOAD`.
- Introducir un perfil neutral `HUMANOID_AVATAR_BASE`.

**Non-Goals:**
- No construir un editor SVG libre ni un editor facial frame-by-frame.
- No soportar cuerpos no humanoides en este cambio.
- No anadir blendshapes, morph targets, facial bones o lipsync.
- No intentar derivar una receta completa desde humanoides genericos que no fueron creados por `Avatar Forge`.
- No rehacer el exportador GLB ni el panel de rig.

## Decisions

### 1. El avatar sigue siendo un `CharacterModel`, no un asset nuevo

**Decision:** `Avatar Forge` generara un grupo humanoide normal con `userData.archetype`, `slotMap`, `skeletonId`, `animationProfile` y geometria real en escena. No se introduce un tipo especial de objeto.

**Why:**
- El pipeline actual ya soporta rig, animaciones y GLB para grupos humanoides.
- Evita duplicar logica de scene, export y selection.
- Permite que el resultado sea util fuera del propio modo.

### 2. Enfoque body-first sobre moldes humanoides existentes

**Decision:** la seleccion de cuerpo se apoyara en moldes ya compatibles con `HUMANOID`, empezando por los generados en `generated-character-molds.js`. `Avatar Forge` solo expondra moldes validados como base de cuerpo.

**Why:**
- El cuerpo determina proporciones, pivots y compatibilidad con el esqueleto.
- Reusar moldes existentes reduce mucho el riesgo de clipping y de drift con el rig.
- Encaja con la documentacion `body-first-character-assembly.md`.

**Alternatives considered:**
- Permitir sliders libres de anatomia desde el MVP. Descartado por combinatoria, clipping y mayor coste de validacion.

### 3. Guardar una receta estructurada `avatarRecipe`

**Decision:** cada avatar creado por el modo guardara una receta declarativa, por ejemplo:

```json
{
  "version": 1,
  "label": "Avatar",
  "bodyMoldId": "psx_humanoid_chibi_mold_cm",
  "headShapeId": "round_soft_01",
  "hairPresetId": "bob_01",
  "eyePresetId": "wide_01",
  "browPresetId": "soft_01",
  "mouthPresetId": "smile_01",
  "accessoryIds": ["ribbon_blue"],
  "palette": {
    "skin": "#e7c1a1",
    "hair": "#6a3a28",
    "iris": "#4b86c5",
    "bodyPrimary": "#5f2940",
    "bodySecondary": "#2f3556"
  },
  "animationProfile": "HUMANOID_AVATAR_BASE"
}
```

**Why:**
- La ficha del personaje debe poder reabrirse y editarse, no solo dejar una malla final.
- La receta mantiene estable el contrato entre UI, preview y reconstruccion.
- Es mas manejable que intentar reconstruir elecciones desde el SVG final.

### 4. La cabeza se compone desde fragmentos SVG curados y se compila a un SVG final

**Decision:** `Avatar Forge` no reutilizara solo "cabezas completas" existentes. Introducira librerias de fragmentos: forma base de cabeza, pelo, ojos, cejas, boca y extras. Un compilador generara un SVG final compatible con el flujo `inflated-head`.

**Why:**
- Un flujo tipo Mii necesita combinacion de rasgos, no solo presets cerrados.
- El pipeline actual de cabeza ya entiende `data-rv-role` y `inflated-head`, asi que compilar a un SVG final aprovecha lo que ya existe.
- La geometria de salida sigue entrando por `buildGroupWithSvgHead`, que ya resuelve fitting sobre el slot `HEAD`.

**Alternatives considered:**
- Usar solo muestras completas de `sample-sources.js`. Descartado porque no permite separar ojos, cejas y boca como elecciones independientes.
- Montar ojos y cejas como meshes 3D externos al head SVG. Descartado por mayor complejidad de fitting y peor coherencia visual.

### 5. Rebuild completo en preview y al confirmar

**Decision:** cada cambio de receta reconstruira un avatar temporal para preview. Al confirmar, el modo insertara un avatar nuevo o reemplazara por completo el grupo avatar anterior.

**Why:**
- Evita mutaciones parciales sobre piezas ya montadas.
- Mantiene una unica via de construccion para preview y resultado final.
- Reduce errores de sincronizacion entre body mold, SVG head y metadata.

### 6. Perfil por defecto `HUMANOID_AVATAR_BASE`

**Decision:** `Avatar Forge` asignara por defecto un nuevo perfil `HUMANOID_AVATAR_BASE` con un subset neutral del esqueleto humanoide, pensado para avatar generico.

**Why:**
- Hoy solo existen `HUMANOID_SWORDSMAN` y `HUMANOID_ARCHER`.
- Un creador de avatares no debe salir acoplado a combate desde el primer export.
- El export GLB ya soporta perfiles; solo falta uno apropiado para este dominio.

**Propuesta inicial del perfil:** `idle`, `walk`, `run`, `hurt`, `die`.

### 7. Persistencia solo para avatares creados por este modo

**Decision:** el soporte de re-edicion se limitara a grupos con `userData.avatarRecipe`. Escenas antiguas y humanoides genericos seguiran funcionando sin cambios, pero no se intentara inventar una receta desde un grupo arbitrario.

**Why:**
- Derivar una receta fiable desde geometria ya compuesta es fragil.
- Mantiene el MVP acotado y defensible.

## Risks / Trade-offs

- **Combinatoria de presets**: demasiadas combinaciones pueden producir resultados flojos.  
  Mitigacion: librerias pequenas, curadas y validadas en parejas estilo/cuerpo.

- **Clipping entre pelo, accesorios y cuerpo**: algunos peinados o cabezas pueden invadir hombros o accesorios.  
  Mitigacion: presets con envelopes validados y limites por familia de cuerpo.

- **Coste de preview**: reconstruir un avatar completo en cada cambio puede ser caro si se hace sin limpieza.  
  Mitigacion: preview temporal, debounce y destruccion explicita de grupos/renderers temporales.

- **Deriva entre receta y resultado final**: si el SVG compilado no se guarda o no coincide con la receta, la re-edicion se vuelve inconsistente.  
  Mitigacion: guardar `avatarRecipe` y la metadata SVG del `HEAD` en el mismo flujo de confirmacion.

## Migration Plan

1. Crear catalogos de presets y validacion de `avatarRecipe`.
2. Crear compilador de cabeza SVG y builder de avatar completo.
3. Integrar el modal `Avatar Forge` en la UI principal con preview y ficha.
4. Persistir `avatarRecipe` en `SAVE`/`LOAD`.
5. Anadir y validar `HUMANOID_AVATAR_BASE`.
6. Verificar preview de rig y export GLB con varios cuerpos y caras.

## Open Questions

- Si el MVP debe exponer tambien orejas y nariz como presets independientes o dejarlos embebidos en las formas de cabeza iniciales.
- Si conviene permitir cambio de `animationProfile` desde el propio modo o dejarlo fijo a `HUMANOID_AVATAR_BASE` en esta primera iteracion.
