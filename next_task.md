# Próximas tareas — Problema 2 (generador de personajes N64/PSX)

> **⛔ CERRADO (2026-07-02): las 6 tareas de este documento están HECHAS.**
> No ejecutar nada de aquí. El roadmap vigente es **`newtask.md`** (y la crítica
> de contexto está en `ideas.md`). Se conserva solo como histórico; las
> "Trampas globales" siguen vigentes y están copiadas en newtask.md.
> Aviso: la capa de offsets por preset (T3) y las placas SVG de rasgos que estas
> tareas pulieron serán SUSTITUIDAS por decals en la Fase 4 de newtask.md —
> no añadir más presets/offsets sobre esa base.

Estado: 2.1, 2.3, 2.4 (pelo casco) y 2.10 (cuerpos PSX) hechas y commiteadas.
Este documento detalla las 6 tareas siguientes en orden recomendado, con
instrucciones suficientes para que las delegables las ejecute un modelo más
barato sin contexto previo.

**Reparto recomendado:**

| Tarea | Quién | Motivo |
|---|---|---|
| T1 Fix bundle `eyeNoseGap` | Delegable | Ajuste numérico acotado + test que ya dice el valor esperado |
| T2 Moldes N64 paramétricos | **Mixto** | Andamiaje delegable; el ajuste visual de proporciones lo hace el modelo caro |
| T3 feature.json relativo + controles Mii (2.2+2.5) | **Modelo caro sí o sí** | Decisiones de formato/arquitectura, matemática de montaje, UI y persistencia entrelazadas |
| T4 Auditoría visual en `npm run check` (2.7) | Delegable | Las tolerancias quedan especificadas abajo; la implementación es mecánica |
| T5 Borrar ruta legacy SVG (2.6) | Delegable | Borrado mecánico con red de seguridad (hacer DESPUÉS de T4) |
| T6 Docs + cierre openspec (2.8+2.9) | Delegable | Redacción a partir de material existente; revisar `ask-head.md` al final |

---

## Trampas globales (leer antes de tocar nada)

1. **Alias del rig humanoide** (`src/modules/viewport/templates.js`, `HUMANOID_NODE_ALIASES` ~línea 295):
   NUNCA nombrar piezas decorativas `SHOULDER_L/R`, `PAULDRON_*`, `CLAVICLE_*`, `WAIST`,
   `LEFT_SHOULDER`, etc. El normalizador reparenta `ARM_L` bajo el nodo clavícula y un
   nombre coincidente crea un ciclo que **desmonta el brazo entero** (síntoma: warnings
   `Animation target ARM_L not found in group`). Usar sufijos tipo `ARM_L_PAD`, `TORSO_WAIST`.
2. **`faceColors` es un ARRAY de hex** (6 colores = 1 por quad, en orden back/front/left/right/top/bottom
   según `TRI_FACES`). Para moldes generados se rehornea desde la paleta con `makeFaceColors(baseColor)`
   exportado por `src/data/templates/generated-character-molds.js` (gate: `PALETTE_DRIVEN_MOLD_IDS`
   en `avatar-builder.js`). Los moldes JSON conservan sus arrays a mano.
3. **Precedencia de color** (`resolvePaletteColorToken` en `src/modules/avatar/avatar-builder.js`):
   las reglas por nombre de pieza (HAND/NECK→skin, FOOT→accent, PELVIS→bodySecondary,
   `_PAD`→bodyPrimary, BELT/COLLAR/RIBBON→accent) van ANTES que `slotColorMap[slotId]`. No reordenar.
4. **Sweeps de captura visual** (PowerShell 5.1, sin `&&`):
   - Cabezas: `$env:CAPTURE_HEADS='1'; npx playwright test avatar-head-capture --reporter=line` → `.tmp-head-views/avatars/`
   - Cuerpos: `$env:CAPTURE_BODIES='1'; npx playwright test avatar-body-capture --reporter=line` → `.tmp-head-views/bodies/`
5. **Dentro de `page.evaluate` NO funciona** `import('three')` ni existe `state.THREE`.
   Para bounding boxes en mundo, copiar el patrón manual de `tests/e2e/avatar-body-capture.spec.js`
   (esquinas de `geometry.boundingBox` × `node.matrixWorld.elements`, column-major).
6. **Flake de arranque**: `helpers/app.js` asserta `#canvas` visible con timeout 5s y el vite
   server arranca frío en cada run (`reuseExistingServer:false`). Si falla el bootstrap, re-ejecutar
   una vez antes de buscar bugs.
7. **Suites de regresión**: `npx playwright test avatar-forge-mold-mode avatar-forge-placement --reporter=line`
   debe dar 16/16 una vez hecha T1 (hoy 15/16 por el fallo que arregla T1). Después `npm run check`.
8. **Commits**: mensaje descriptivo (nunca "work in progress"), terminar con
   `Co-Authored-By:` del modelo que firma. Branch: `fable/fixing_problems`.
9. **NO tocar** el Problema 1 (mocap/skeleton capture) ni nada bajo esa área de task.md.

---

## T1 — ✅ HECHO (commit 9fa5bf0) — Arreglar el solape ojo-nariz del bundle por defecto

**Síntoma:** `avatar-forge-placement.spec.js:327` ("defines readable mold feature bundles")
falla: `psx_mesh_soft_default_01 eyeNoseGap` = −0.0878, esperado ≥ 0. Es decir, en el bundle
por defecto los ojos (`wide_01`) y la nariz (`nose_soft_01`) se solapan verticalmente.

**Archivos:**
- `src/data/avatar/catalog/mold-feature-bundles.js` — define el bundle (combinación de presets).
- `src/data/avatar/catalog/head-molds.js` — `MESH_PORTRAIT_PART_PRESET_OFFSETS` (~línea 60-87):
  offsets por preset (`y`, `scaleX`, `scaleY`, `originX/Y`) que se aplican sobre el montaje por landmarks.
- El test mide gaps reales construyendo el avatar; leerlo (líneas ~327-435) para ver cómo calcula
  `eyeNoseGap` antes de tocar nada.

**Pasos:**
1. Ejecutar solo ese test y confirmar el −0.0878.
2. Opción A (preferida): en `MESH_PORTRAIT_PART_PRESET_OFFSETS`, subir ligeramente los ojos
   (`wide_01`: `y` más negativo) y/o bajar la nariz (`nose_soft_01`: `y` más positivo) en pasos
   pequeños (~2-4 unidades SVG) hasta que `eyeNoseGap ≥ 0` sin romper `browEyeGap ≥ −0.02`
   ni `noseMouthGap ≥ 0.015` (el mismo test los comprueba todos).
   Opción B (solo si A deforma la cara): cambiar el preset de nariz del bundle a otro más corto.
3. Validar: el test de placement completo en verde (16/16 junto con mold-mode), y
   sweep `CAPTURE_HEADS` mirando `psx_mesh_portrait_*_front.png`: ojos y nariz separados,
   cara natural. Adjuntar/conservar las capturas para revisión.
4. `npm run check`. Commit.

**Criterio de éxito:** 16/16 en las dos suites de avatar + captura frontal sin solape visible.

---

## T2 — ✅ HECHO (commit 4f049be) — Moldes N64 paramétricos

**Síntoma:** `n64_classic` y `n64_round` (JSON a mano en `src/data/templates/characters/
n64_humanoid_mold_cm.json` y `n64_body_mold_cm.json`) quedaron muy por detrás de los 4 moldes
PSX generados: brazos tipo maza flotante, sin manos diferenciadas, silueta pobre
(ver `.tmp-head-views/bodies/n64_classic_front.png`).

**Objetivo:** portarlos al generador paramétrico de `src/data/templates/generated-character-molds.js`
con estética N64 (referencia Mario 64 / Ocarina low-LOD): torso ovalado/ancho, cuello corto o
inexistente, manos grandes tipo guante, pies grandes, menos segmentación que los PSX.

**Parte delegable (andamiaje):**
1. Añadir 2 variantes nuevas a `MOLD_VARIANTS` en `generated-character-molds.js` reutilizando
   los builders existentes (`makeChestMesh`, `makeLimbMesh`, `handPiece`, etc.). Ids nuevos:
   `n64_humanoid_round_mold_cm` y `n64_humanoid_classic_mold_cm` (NO reutilizar los ids JSON
   viejos todavía). Specs iniciales: copiar la del chibi y ensanchar torso / agrandar manos y pies.
2. Apuntar los presets `n64_classic` y `n64_round` de `src/data/avatar/catalog/body-presets.js`
   a los ids nuevos.
3. Ejecutar el sweep `CAPTURE_BODIES`, las dos suites de avatar y `npm run check`.
   Los JSON viejos se quedan en el repo (otros templates pueden referenciarlos; comprobar con
   grep antes de plantear borrarlos — si nada más los usa, proponer su borrado en el commit message).

**Parte para el modelo caro (no delegar):** iterar las specs sobre las capturas hasta que la
silueta "dé el pego" N64 (proporciones, redondez del torso vía `bottomWidth/topWidth`,
tamaño relativo cabeza/manos), y decidir si los moldes JSON viejos se borran o se renombran.

**Criterio de éxito:** capturas front/profile/three-quarter de ambos presets N64 con calidad
comparable a los PSX; suites en verde; `npm run check` pasa (ojo: el audit cuenta 289 templates —
si se borran JSON habrá que ver si el contador es dinámico o hay lista fija).

---

## T3 — ✅ HECHO — feature.json relativo al cráneo + controles tipo Mii (2.2 + 2.5)

_Resultado: escala relativa al cráneo (`resolveFeatureRelativeSizeFactor` en avatar-builder.js,
clamp 0.75–1.35, solo rasgos faciales) + offsets/spacing de los sliders Mii convertidos a
desplazamientos relativos a la interocular en `buildLandmarkMountPlan`
(svg-head-integration.js). Los sliders ya existían en la UI y persistían en
`recipe.features[key].placement`; lo que faltaba era que el recentrado por landmarks no los
anulara en 3D. Test nuevo: «applies Mii placement sliders and skull-relative sizing» en
avatar-forge-placement.spec.js. Limitación conocida (relevante para T6/docs): los sliders de
pelo no afectan al casco procedural de hair-helmet.js._

Contexto original (ya ejecutado): no delegar. Razones: decide el formato `feature.json` (contrato para todo lo posterior, incluido
el prompt LLM de T6), toca la matemática de `buildLandmarkMountPlan`
(`src/modules/svg/svg-head-integration.js`), el esquema de `avatarRecipe` (persistencia y
migración de recetas guardadas), y la UI del forge — todo acoplado y con criterio visual fino.

**Alcance resumido (para planificación, no para ejecutar):**
1. **2.2 — tamaño relativo:** cada preset de rasgo declara su tamaño proporcional a la distancia
   interocular (`|eyeR − eyeL|`) o al bounding del cráneo de la cabeza destino, en vez de píxeles
   absolutos del SVG. Aplicarlo en el plan de montaje de landmarks. Migrar
   `MESH_PORTRAIT_PART_PRESET_OFFSETS` (que T1 acaba de ajustar) al nuevo esquema.
2. **2.5 — controles Mii:** 4 deltas por rasgo (size / up-down / left-right / spacing) aplicados
   sobre el landmark, persistidos en `avatarRecipe.features[key]` junto al `presetId`.
   UI: sliders en el panel del forge solo en modo molde.
3. Validación: sweep de cabezas con deltas extremos (±máximo) sin que ningún rasgo salga de la
   cara; los gaps del test de placement siguen cumpliéndose con deltas en 0 (compatibilidad).

---

## T4 — ✅ HECHO — Auditoría visual automática en `npm run check` (2.7)

**Objetivo:** que `npm run check` falle si un rasgo se sale de la tolerancia de su landmark,
usando la infraestructura que ya existe (sweeps Playwright + audit scripts de `scripts/`).

**Especificación (fijada, no inventar otra):**
1. Nuevo script `scripts/avatar-visual-audit.mjs` o test Playwright NO gateado por env var
   (decidir según lo que ya consuma `scripts/check-release-readiness.mjs`; integrarlo en la
   cadena del `npm run check` igual que `template-asset-audit.mjs`).
2. Para cada cabeza registrada × bundle por defecto: construir el avatar (headless, como hacen
   los tests de placement) y medir en espacio canónico de cabeza:
   - centro de cada rasgo vs su landmark: distancia ≤ 0.18 (unidades de cabeza canónica, altura 1.2);
   - los mismos gaps del test de placement (`browEyeGap ≥ −0.02`, `eyeNoseGap ≥ 0`,
     `noseMouthGap ≥ 0.015`, `mouthBottom ≤ 0.9`, `earTop ≥ 0.38`) — reutilizar/extraer esa
     lógica a un helper compartido en vez de duplicarla;
   - ningún vértice de rasgo por debajo de `chin.y` ni por encima de `crown.y + 0.1`.
3. Guardar screenshots de comparación en `.tmp-head-views/audit/` solo en modo verbose/CI-fail
   (no en cada `npm run check` para no ralentizarlo; medir primero cuánto tarda).
4. Si la auditoría duplica >50% del test `defines readable mold feature bundles`, consolidar:
   el test e2e puede quedarse como smoke y la auditoría ser la fuente de verdad.

**Criterio de éxito:** `npm run check` pasa hoy; introducir a mano un offset roto (p. ej. nariz
y −40) hace que falle con mensaje claro; revertirlo lo deja en verde.

---

## T5 — ✅ HECHO — Borrar la ruta legacy SVG (2.6)

**Objetivo:** eliminar el catálogo amplio de `head-shapes`, la cara SVG completa como base y las
familias PSX/N64/Bridge como eje del builder. Estamos pre-1.0: se acepta romper recetas guardadas.

**Pasos:**
1. Inventario con grep: quién importa `head-shapes.js`, quién usa `sourceHeadShapeId`,
   rutas legacy en `avatar-builder.js` (`createAvatarHeadSource` por SVG-shape vs mold) y en el
   panel del forge ("modo legacy" — hay un test que lo cubre:
   "keeps legacy avatar recipes editable while disabling mold-only controls").
2. Borrar en capas: primero UI (entradas de catálogo/selector), luego builder, luego datos.
   Tras cada capa: las dos suites de avatar + `npm run check`.
3. Los tests que cubren explícitamente el modo legacy se borran o reescriben hacia mold-mode
   (decisión simple: si el test solo existe para la ruta borrada, se borra con ella).
4. Si una receta guardada legacy llega al builder, debe fallar con mensaje claro o migrarse a un
   molde por defecto — elegir UNA de las dos y documentarla en el commit.

**Criterio de éxito:** no quedan referencias a `head-shapes`/familias legacy (grep limpio),
suites en verde, `npm run check` (incluida la auditoría T4) pasa.

---

## T6 — ✅ HECHO — `docs/HEADS.md` + `ask-head.md` + cierre openspec (2.8 + 2.9)

1. **`docs/HEADS.md`:** documentar el pipeline real: formato `head.json` (geometría + `axes` +
   los 9 landmarks: eyeL, eyeR, noseTip, mouth, earL, earR, hairline, crown, chin; espacio
   canónico +Y up / +Z cara / altura 1.2 / base y=0), `scripts/derive-head-landmarks.mjs`,
   formato `feature.json` (el que defina T3 — si T3 no está hecha, documentar el estado actual y
   marcar la sección como provisional), pelo-casco (`hair-helmet.js`, 5 estilos), y los sweeps de
   captura. Seguir el patrón de los docs existentes de objetos/animaciones.
2. **`ask-head.md`:** prompt autocontenido para que un LLM externo genere una `head.json` válida:
   ejemplo completo de cabeza pequeña, rangos de proporción aceptados, checklist con los umbrales
   de la auditoría T4. Mismo patrón que el `ask.md` que ya funciona para objetos.
3. **2.9 openspec:** revisar los 2 changes activ