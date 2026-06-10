## Context

`Avatar Forge` nació sobre un flujo muy útil para iterar rápido: molde de cuerpo humanoide + cabeza compilada desde SVG + fitting al slot `HEAD`. Ese planteamiento permitió montar un catálogo grande, pero el coste ha quedado claro: los cráneos se corrigen con offsets globales, el pelo depende de shells 2D inflados y el perfil lateral rara vez queda sólido cuando cambia la silueta base.

Ahora existe una excepción importante: la nueva cabeza mesh (`psx_mesh_portrait_01`) sí ofrece un cráneo útil. Eso cambia la dirección técnica. En vez de seguir persiguiendo compatibilidad entre muchas cabezas equivalentes, el sistema puede pivotar a una arquitectura más estable:

- un `head mold` 3D canónico
- rasgos independientes montados sobre anchors
- controles por avatar para recolocar rasgos sin rehacer presets
- ruta `legacy` conservada para recetas antiguas y compatibilidad

La dificultad no está en el rig ni en el export. Está en convivir durante un tiempo con dos pipelines de cabeza sin romper `Avatar Forge`, `SAVE/LOAD`, ni la edición posterior.

## Goals / Non-Goals

**Goals:**
- Convertir el nuevo `PSX Mesh Portrait` en la base canónica de todas las sesiones nuevas de `Avatar Forge`.
- Separar `eyes`, `brows`, `nose`, `mouth`, `ears` y `hair` del concepto de "cara completa".
- Introducir controles tipo Mii por avatar: `size`, `up/down`, `left/right`, y `spacing` para ojos.
- Mantener recetas y escenas `legacy` funcionales sin migración forzada.
- Preparar el sistema para futuras cabezas authoradas en Blender sin volver a diseñar la UI ni el contrato de receta.

**Non-Goals:**
- No introducir escultura libre, morph targets ni blendshapes.
- No convertir automáticamente todas las recetas viejas al sistema nuevo.
- No resolver en este cambio la pintura manual por caras o por triángulos.
- No abrir todavía controles independientes por lado para ojos, cejas u orejas.
- No prometer una biblioteca grande de múltiples `head molds` en la primera iteración.

## Decisions

### 1. `psx_mesh_portrait_01` será el único `head mold` canónico para sesiones nuevas

**Decision:** toda sesión nueva de `Avatar Forge` arrancará sobre `headBuildMode: "mold"` y `headMoldId: "psx_mesh_portrait_01"`.

**Why:**
- Es la única base craneal que ya ha demostrado leer mejor en frontal y perfil.
- El nuevo sistema necesita una referencia estable para rasgos y pelo; varias cabezas base volverían a multiplicar el problema demasiado pronto.
- Permite limpiar el diseño del builder sin bloquear recetas antiguas.

**Alternatives considered:**
- Mantener varios `head shape` como bases equivalentes. Descartado porque preserva la misma combinatoria frágil que queremos reducir.
- Forzar `psx_mesh_portrait_01` también para recetas antiguas. Descartado por riesgo de deriva visual y de pérdida de edición fiel.

### 2. La receta del avatar pasa a ser versionada y con dos modos explícitos

**Decision:** `avatarRecipe` tendrá un contrato versionado con un discriminante explícito de construcción:

```json
{
  "version": 2,
  "headBuildMode": "mold",
  "headMoldId": "psx_mesh_portrait_01",
  "features": {
    "eyes": { "presetId": "wide_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0, "spacing": 0 } },
    "brows": { "presetId": "soft_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "nose": { "presetId": "nose_soft_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "mouth": { "presetId": "neutral_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "ears": { "presetId": "ear_soft_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "hair": { "presetId": "bob_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } }
  }
}
```

Las recetas antiguas seguirán resolviéndose como:

```json
{
  "version": 1,
  "headBuildMode": "legacy",
  "headShapeId": "psx_portrait_01",
  "...": "campos legacy existentes"
}
```

**Why:**
- El discriminante evita heurísticas frágiles.
- Mantiene `SAVE/LOAD` exacto y hace reversible la convivencia temporal de ambos sistemas.
- Permite crecer en el futuro sin volver a romper escenas guardadas.

**Alternatives considered:**
- Reusar los campos actuales sin `headBuildMode`. Descartado porque obliga a inferir rutas y complica persistencia y edición.

### 3. Los rasgos se montan por `mount role` + placement defaults + overrides del avatar

**Decision:** el sistema nuevo resolverá cada rasgo por tres capas:

1. `mount role` del `head mold` (`eyePair`, `browPair`, `nose`, `mouth`, `earPair`, `hairCap`)
2. defaults del preset (`placementDefaults`)
3. overrides por avatar (`placement`)

La posición final será la suma de defaults + overrides, y el tamaño final será `defaultScale * placement.size`.

**Why:**
- Separa authoring estable del ajuste artístico por avatar.
- Evita que cada preset tenga que saber todo sobre cada combinación posible.
- Permite mover rasgos en runtime sin reautorizar la geometría base.

**Alternatives considered:**
- Offsets globales por cabeza. Descartado porque es el problema actual.
- Anchors absolutos por preset sin overrides. Descartado porque bloquea la personalización tipo Mii.

### 4. Los rasgos emparejados serán simétricos en el MVP

**Decision:** ojos, cejas y orejas se tratarán como pares simétricos. El usuario editará una sola configuración compartida por par; `spacing` sólo existirá para ojos.

**Why:**
- Reduce mucho la complejidad del modelo y de la UI.
- Encaja con el tipo de control Mii que el usuario ha pedido.
- Evita introducir asimetría arbitraria antes de tener una base estable.

**Alternatives considered:**
- Controles independientes izquierda/derecha. Descartado para esta fase por exceso de complejidad y peor UX inicial.

### 5. El builder tendrá dos pipelines de cabeza, pero sólo uno será visible para sesiones nuevas

**Decision:**
- `mold` será la ruta primaria para nuevas sesiones.
- `legacy` seguirá disponible para recetas antiguas.
- En la primera iteración no habrá un selector público para alternar libremente entre ambos modos en una sesión nueva.

**Why:**
- La convivencia es necesaria para no romper escenas ni recetas previas.
- Es mejor limitar el nuevo flujo a una dirección clara que abrir dos caminos equivalentes en la UI.
- Permite validar el sistema nuevo sin volver a normalizar el viejo como primera clase.

**Alternatives considered:**
- Exponer un toggle público `Mold / Legacy` desde el primer día. Descartado porque duplica QA y mantiene la ambigüedad del producto.

### 6. Pelo y orejas también pasan a ser montaje separado, pero con rollout por fases

**Decision:** `hair` y `ears` entran en el nuevo contrato de `features`, aunque el rollout será incremental:

- Fase 1: ojos, cejas, nariz, boca
- Fase 2: orejas
- Fase 3: pelo ya anclado al `hairCap` del `head mold`

**Why:**
- El objetivo final es que todo lo facial dependa del cráneo correcto.
- El pelo es la parte más sensible y no conviene mezclarlo con la primera entrega de controles.
- La nariz es imprescindible porque hoy ni siquiera existe como catálogo real separado.

**Alternatives considered:**
- Mover pelo al MVP completo. Descartado porque es el mayor foco de clipping y conviene llegar a él con el sistema de rasgos ya estabilizado.

### 7. La pintura por caras queda explícitamente fuera de esta iteración

**Decision:** no se añadirá edición manual de colores por cara o triángulo en este cambio. El color seguirá viniendo de preset/paleta/material.

**Why:**
- Pintura y placement son dos problemas distintos.
- Si se mezclan ahora, el debugging geométrico se vuelve mucho más caro.
- El sistema necesita primero mounts, recipe y persistencia estables.

## Risks / Trade-offs

- **[Dos pipelines de cabeza en paralelo]** → Mitigación: discriminante `headBuildMode`, builders separados y tests específicos por modo.
- **[Clipping entre pelo/orejas y el nuevo cráneo]** → Mitigación: rollout por fases y anchors explícitos en el `head mold`.
- **[UI más densa en Avatar Forge]** → Mitigación: controles compactos por rasgo, valores limitados y sin asimetría por lado en el MVP.
- **[Persistencia inconsistente entre recetas antiguas y nuevas]** → Mitigación: versionado de `avatarRecipe`, normalización explícita y roundtrip por modo.
- **[Nueva nariz sin suficiente variedad]** → Mitigación: arrancar con una librería pequeña pero real y defaults aproximados robustos.

## Migration Plan

1. Definir el nuevo contrato `avatarRecipe` con `headBuildMode: mold|legacy`.
2. Crear el catálogo mínimo de `head mold`, `nose`, `ears` y placement metadata.
3. Implementar el builder de cabeza `mold` sin retirar el builder `legacy`.
4. Hacer que las sesiones nuevas de `Avatar Forge` arranquen siempre en `mold` sobre `psx_mesh_portrait_01`.
5. Añadir controles de placement por rasgo y persistirlos en `SAVE/LOAD`.
6. Integrar pelo y orejas en la ruta nueva cuando ojos/cejas/nariz/boca ya estén estables.
7. Mantener rollback simple: si la ruta `mold` falla, las recetas `legacy` siguen reabriéndose y construyéndose por el camino antiguo.

## Legacy Head Disposition

La revisiÃ³n de `head shapes` restantes deja una regla operativa simple: la librerÃ­a legacy ya no define el futuro del builder, pero sigue siendo necesaria como capa de compatibilidad mientras existan recetas guardadas y auditorÃ­as que dependan de esas siluetas.

**Heads que se quedan como fallback-only:**
- `square_mii_01`
- `psx_hero_jaw_01`
- `wide_cheek_01`
- `psx_skull_01`
- `n64_skull_01`
- `psx_portrait_01`

**Tratamiento acordado para ellos:**
- no aparecen como base primaria de sesiones nuevas
- siguen reabriÃ©ndose en `legacy` sin migraciÃ³n forzada
- se mantienen en las auditorÃ­as visuales y de accesorios porque siguen cubriendo extremos de silueta PSX/N64 que todavÃ­a protegen compatibilidad real

**Head que queda oculto y candidato a retirada posterior:**
- `psx_portrait_skull_01`

**Motivo:**
- ya estÃ¡ fuera de la ruta principal y de los barridos representativos
- sÃ³lo conserva valor para revisiÃ³n de calvas, comparativas de migraciÃ³n y debugging puntual
- cuando el pelo anclado al `head mold` y la reapertura de recetas legacy estÃ©n estables sin depender de este crÃ¡neo, serÃ¡ el primer candidato a eliminaciÃ³n

**Head que pasa a ser la base oficial y no cuenta como legacy:**
- `psx_mesh_portrait_01`

**Consecuencia prÃ¡ctica:**
- cualquier trabajo nuevo de fitting, placement o authoring facial se hace sobre `psx_mesh_portrait_01`
- cualquier ajuste especÃ­fico para `legacy` se trata como mantenimiento de compatibilidad, no como extensiÃ³n del sistema principal

## Open Questions

- Si `ears` deben exponerse como selector visible desde la primera entrega o entrar primero como preset fijo por `head mold`.
- Si el pelo nuevo debe seguir partiéndose en `front/back` o pasar a una descripción más orientada a `hair cap` y masas laterales.
- Si en una fase posterior conviene ofrecer migración asistida de recetas `legacy` a `mold`, o si eso debe seguir siendo manual.
