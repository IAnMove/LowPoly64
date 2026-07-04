# tasks.md — Cabezas v2: cráneos generados + caras sprite

## ⚠️ BREAKING CHANGE anunciado (2026-07-02)

Las 7 cabezas malladas a mano (`normal175`, `cabezon175`, `duro175`, `duro250`,
`gordo175`, `gordo275`, `white_mesh180`) **se eliminan del proyecto**. Tienen
nariz y rasgos esculpidos en la malla, lo que choca con el pipeline de rasgos
montados (decal + piezas 3D) y las hace imposibles de reutilizar bien. Las
recetas de avatar guardadas que las referencien se normalizarán a la cabeza
generada por defecto. Este documento es el plan completo del cambio.

**Decisiones tomadas (con el usuario, 2026-07-02):**

1. Cabezas viejas: se borran del todo (breaking change limpio, sin legacy).
2. Geometría nueva: **generador paramétrico de cráneos** en el editor (como el
   generador de cuerpos `generated-character-molds.js`): parámetros → malla
   low-poly limpia SIN nariz/boca/orejas, con landmarks exactos por construcción.
3. Ojos/boca/cejas: **atlas de sprites pixel-art** (PNG con fondo transparente,
   estilo Ocarina: ojos grandes y expresivos) compuestos en el decal curvado.
4. Nariz, orejas y pelo: siguen siendo **objetos 3D** montados por landmarks.
5. Se CONSERVA la base que funciona: montaje por landmarks
   (`buildLandmarkMountPlan`), decal curvado con muestreo de malla
   (`buildFaceDecalPart`), casco de pelo procedural (`hair-helmet.js`),
   sliders Mii, cuerpos generados, rig HUMANOID_STANDARD y clips. NO tocar.

**Reparto:** tareas marcadas `[FABLE]` las hace el modelo capaz (juicio visual
o arquitectura); `[DELEGABLE]` las puede hacer cualquier IA siguiendo los pasos
al pie de la letra. Las trampas globales de `newtask.md` siguen vigentes
(alias del rig, faceColors, sweeps de captura, PowerShell sin `&&`).

**Orden:** H1 (generador) → H2 (sprites) → H0 (demolición) → H3 (rasgos 3D) → H4 (cierre).
El generador se construye ANTES de borrar nada: así nunca hay un estado sin cabezas.

---

# FASE H1 — Generador paramétrico de cráneos

## H1.1 [FABLE] Núcleo del generador (`src/data/avatar/generated-heads.js`)

**✅ HECHO (núcleo + H1.1a + H1.1b).** `buildGeneratedHead(spec)` genera cráneos
de ~130 tris con placa facial vertical, frente que retrocede y masa occipital
(proporciones medidas de normal175); landmarks derivados del spec; validado por
`scripts/check-generated-heads.mjs` (manifold cerrado, winding, simetría,
landmarks) integrado en `npm run check`, incluyendo extremos del espacio de
parámetros. Preview sin editor: `node scripts/preview-generated-head.mjs` (dump
JSON). **Queda H1.1c** (adaptador al catálogo) — delegable, ver abajo.

**Contexto:** la tarea difícil del plan. Un builder que, a partir de un spec de
parámetros, genera un cráneo low-poly limpio + landmarks. Referencia de estilo:
craneos N64 (Ocarina adulto/niño): silueta fuerte, 150–300 triángulos, flat
shading, sin rasgos esculpidos.

**Contrato de salida (idéntico al que hoy expone `head-meshes.js` para que el
resto del pipeline no cambie):** cada cabeza generada produce una entrada
`{ id, customGeometry: { vertices, faces }, landmarks, axes: { up: '+y', front: '+z' } }`
en el espacio canónico actual (misma convención que consumen
`buildFaceDecalPart` y `hair-helmet.js`; comprobar en `head-meshes.js` cómo
quedan normalizadas hoy las cabezas antes de escribir el generador).

**Parámetros del spec (v1, todos 0–1 salvo indicación):**

```js
{
  skullWidth,      // anchura del cráneo a la altura de las sienes
  skullDepth,      // profundidad frente-nuca
  skullHeight,     // altura total
  crownRoundness,  // 0 = tapa plana, 1 = cúpula esférica
  jawWidth,        // anchura de la mandíbula relativa al cráneo
  jawDrop,         // longitud de la mandíbula (0 = cara redonda, 1 = alargada)
  chinShape,       // 0 = barbilla redonda, 1 = puntiaguda
  cheekFullness,   // 0 = mejillas planas, 1 = carrillos inflados
  faceFlatness,    // cuánto se aplana la zona de la cara (frente+mejillas)
  eyeLineHeight,   // altura de la línea de ojos (fracción de la altura, ~0.55)
}
```

**Algoritmo recomendado (anillos apilados, mismo espíritu que `limbLoft`):**

1. Generar 6–8 anillos horizontales elípticos de 8 lados desde la base de la
   mandíbula hasta la coronilla. Radios X/Z de cada anillo derivados de los
   parámetros (mandíbula estrecha abajo → sienes anchas → cúpula que cierra).
2. Aplanar la cara: para los vértices frontales (z > 0) de los anillos entre
   mandíbula y frente, comprimir z hacia un plano según `faceFlatness`. Esto
   crea la "placa facial" donde vivirá el decal.
3. Cerrar coronilla (fan hacia un vértice apical desplazado según
   `crownRoundness`) y base (fan hacia el centro del cuello).
4. Triangular anillos consecutivos como en `createLimbLoftGeometry`
   (`src/modules/viewport/custom-geometries.js`) — copiar ese patrón.
5. Derivar landmarks DEL PROPIO SPEC (no medir la malla a posteriori):
   `eyeL/eyeR` = puntos sobre la placa facial a `eyeLineHeight`, separados
   ~0.42×anchura de placa; `mouth` bajo ellos según `jawDrop`; `noseTip` entre
   ambos sobre la superficie; `chin` = frente-inferior de la mandíbula;
   `earL/earR` = laterales a la altura de ojos; `hairline` = frente a ~0.78 de
   altura; `crown` = ápice. Los landmarks son el contrato: rasgos y pelo se
   cuelgan de ellos.

**Subtareas si se delega parcialmente:**
- H1.1a [FABLE] anillos + placa facial + triangulación (la geometría).
- H1.1b [DELEGABLE tras H1.1a] derivación de landmarks desde el spec (fórmulas
  arriba; validar con el test de H1.4).
- H1.1c [DELEGABLE] adaptador al formato de entrada de `head-meshes.js` /
  `AVATAR_HEAD_MESH_MAP` para que el catálogo consuma cabezas generadas igual
  que consumía las malladas.

**Validación:** test de nodo nuevo `scripts/check-generated-heads.mjs`:
para cada preset — malla cerrada (cada arista compartida por 2 caras), sin
caras degeneradas, 100–400 triángulos, landmarks dentro del bounding box,
`eyeL.x > 0 > eyeR.x` (o la convención vigente en `head-meshes.js`), simetría
X (|v(x)| tiene espejo). Integrarlo en `npm run check`.

**Criterio de éxito:** un preset por defecto renderiza como cráneo N64 creíble
de frente y perfil (sweep CAPTURE_HEADS) y el decal + nariz + orejas + pelo se
montan sin ajustes manuales.

## H1.2 [MIXTO] Presets curados

**Contexto:** tabla de 6–8 combinaciones de parámetros con personalidad:
`round` (redonda amable), `square` (mandíbula fuerte), `long` (alargada),
`chibi` (cráneo enorme, mandíbula mínima), `slim` (fina), `broad` (ancha),
`heroic` (proporción adulta OoT), `wide_jaw` (carrillos).

**✅ HECHO.** Hay 8 specs curados en
`src/data/avatar/generated-heads.js`, registrados como moldes
`gen_head_*` en `src/data/avatar/catalog/head-molds.js` y adaptados a
`AVATAR_HEAD_MESH_MAP`. El ajuste FABLE se hizo con 3 iteraciones mirando
`/.tmp-head-views/all-options/headMold_contact.png`; todos los `gen_head_*`
pasan `npm run audit:avatar-visual` (solo queda el fallo legacy conocido de
`psx_mesh_portrait_01`).

**Criterio de éxito:** sweep CAPTURE_HEADS muestra 6–8 cráneos claramente
distintos entre sí y todos "N64 creíbles".

## H1.3 [DELEGABLE] Sliders de cráneo en el editor

**✅ HECHO.** El editor expone sliders `skullWidth`, `jawDrop`,
`crownRoundness` y `cheekFullness` para molds generados, persistidos como
deltas en `avatarRecipe.headParams`. `buildAvatarGroup` regenera malla y
landmarks al vuelo, y el test e2e de H1.3 verifica que `skullWidth` cambia el
bounding X de `HEAD_BASE` y separa los ojos del decal.

**Contexto:** el generador hace trivial lo que antes era imposible: sliders
tipo Mii para la FORMA de la cabeza.

**Pasos:**
1. Exponer 3–4 parámetros (skullWidth, jawDrop, crownRoundness, cheekFullness)
   como sliders en el bloque de cabeza del panel avatar (`avatar-ui.js` +
   `avatar-html.js`; copiar el patrón de los sliders de pelo de
   `hair-helmet.js` hechos en la tarea 402b3a2).
2. Persistir en `avatarRecipe.headParams` (deltas sobre el preset elegido).
   Regenerar malla + landmarks al mover (regenerar es barato, <5 ms).
3. Test e2e: mover skullWidth cambia el bounding X de HEAD y arrastra los
   landmarks (los ojos se separan proporcionalmente).

**Criterio de éxito:** mover sliders deforma el cráneo en vivo sin romper el
montaje de rasgos (el decal sigue la cara).

## H1.4 [DELEGABLE] Tests del pipeline con cabezas generadas

**✅ HECHO.** Las suites de captura, placement, mold-mode y auditoría visual
iteran sobre presets generados (`GENERATED_HEAD_MOLDS` / `generatedPresetId`)
en vez de depender de los ids legacy para el sweep. Se mantienen las aserciones
de alineación y se recalibran solo los márgenes agregados necesarios para la
geometría generada.

Validado con `npm run audit:avatar-visual`,
`npx playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke`,
`npx playwright test tests/e2e/avatar-forge-mold-mode.spec.js --project=smoke`
y `$env:CAPTURE_HEADS='1'; npx playwright test tests/e2e/avatar-head-capture.spec.js --project=smoke`.

**Pasos:** actualizar `tests/e2e/avatar-head-capture.spec.js`,
`avatar-forge-placement.spec.js`, `avatar-forge-mold-mode.spec.js` y
`tests/e2e/helpers/avatar-visual-audit.js` para iterar sobre los presets
generados en vez de los ids viejos. NO borrar aserciones: retargetearlas.
Las tolerancias de rasgo-vs-landmark se mantienen.

**Criterio de éxito:** suites de avatar en verde contra cabezas generadas.

---

# FASE H2 — Atlas de sprites pixel-art para ojos/boca/cejas

## H2.1 [DELEGABLE] Formato del atlas + cargador

**✅ HECHO.** Existe `src/data/avatar/sprites/` con PNGs mínimos por tipo
(`eye_oval`, `mouth_smile`, `brow_flat`) y `sprites-manifest.json`. El
cargador `loadSprite(id, tints)` en `texture-generator.js` resuelve los PNGs
como assets Vite, aplica palette-swap exacto por `tintSlots` en un canvas
intermedio y cachea por id+tintes. `npm run check` incluye
`scripts/check-avatar-sprites.mjs` para validar ids únicos, dimensiones PNG y
placeholders declarados.

Validado con `node ./scripts/check-avatar-sprites.mjs`,
`npx playwright test tests/e2e/face-decal-generator.spec.js --project=smoke`,
`npm run check` y `npm run build`.

**Contexto:** sustituir el DIBUJO procedural del decal por sprites PNG,
manteniendo intacta la colocación (capas, sliders, decal curvado).

**Formato:**
- Carpeta `src/data/avatar/sprites/` con PNGs individuales de 32×32 (ojos,
  por lado L/R espejado en código) y 48×24 (bocas), 48×16 (cejas). Fondo
  transparente. Nombres: `eye_<estilo>.png`, `mouth_<estilo>.png`,
  `brow_<estilo>.png`.
- Manifest `sprites-manifest.json`: `{ id, kind, file, tintSlots }` donde
  `tintSlots` mapea colores placeholder → token de paleta:
  `{ "#ff00ff": "iris", "#00ff00": "lip" }` (palette-swap clásico por color
  exacto; los sprites se dibujan con esos colores puros donde va el tinte).
- Cargador en `src/modules/texture/texture-generator.js`: `loadSprite(id)` →
  Image + swap de colores en un canvas intermedio (leer ImageData, reemplazar
  RGB exactos, escribir). Cache por (id, tintes). Importar los PNG con
  `new URL('...', import.meta.url)` o el mecanismo de assets de Vite que ya
  use el proyecto (comprobar cómo se cargan otros assets antes de elegir).

**Pasos:** implementar cargador + swap + cache; test de nodo del manifest
(ids únicos, ficheros existen, tintSlots válidos) integrado en `npm run check`.

**Criterio de éxito:** `loadSprite('eye_oval', { iris: '#3a6ea5' })` devuelve
un canvas con el iris azul y el resto intacto.

## H2.2 [FABLE] Dibujar el set inicial de sprites

**✅ HECHO.** Set v1 generado con `scripts/draw-sprites.mjs`: 6 ojos
(`eye_oval`, `eye_dot`, `eye_halfmoon`, `eye_angry`, `eye_star`,
`eye_lash`), 5 bocas (`mouth_smile`, `mouth_flat`, `mouth_open`,
`mouth_frown`, `mouth_grin`) y 3 cejas (`brow_flat`, `brow_angled`,
`brow_thick`). Los PNGs son assets versionados en
`src/data/avatar/sprites/`, con placeholders exactos `#ff00ff`,
`#00ff00` y `#0000ff`. La hoja de contactos está en
`docs/avatar-sprites/h2.2-contact-sheet.png` a 2x para revisión a 100%
y 50%. Revisión visual 2026-07-03: el set se refrescó usando
`docs/avatar-sprites/h2.2-image2-reference.png` como referencia de ChatGPT
Image 2, manteniendo los PNG finales regenerables desde
`scripts/draw-sprites.mjs`.

Validado con `node ./scripts/draw-sprites.mjs`,
`node ./scripts/check-avatar-sprites.mjs`,
`npx playwright test tests/e2e/face-decal-generator.spec.js --project=smoke`,
`npm run check` y `npm run build`.

**Contexto:** juicio visual puro. Set v1: 6 ojos (`oval`, `dot`, `halfmoon`
soñoliento, `angry`, `star` brillante, `lash` con pestaña), 5 bocas (`smile`,
`flat`, `open`, `frown`, `grin` con dientes), 3 cejas (`flat`, `angled`,
`thick`). Estilo: pixel art limpio 32px, contorno oscuro 1px, iris en
`#ff00ff` placeholder, blanco del ojo blanco puro, estética Ocarina/Majora.

**Método sugerido:** generarlos por código (script `scripts/draw-sprites.mjs`
con node-canvas o canvas del navegador vía Playwright) y COMMITEAR los PNG
resultantes como assets versionados — así son regenerables y ajustables por
parámetros. Alternativa: dibujarlos a mano en un editor de píxeles.

**Criterio de éxito:** hoja de contactos (script que compone todos los sprites
en una imagen) revisada visualmente: legibles a 100% y a 50% de zoom.

## H2.3 [DELEGABLE] Integrar sprites en el decal

**✅ HECHO.** `renderDecalLayers` compone capas con `sprite` usando
`drawImage`, aplica `tint` vía `loadSprite`, espeja horizontalmente `side: "R"`
y conserva el dibujo procedural como fallback cuando no hay sprite o aún no se
cargó el asset. `createFaceDecalTextureAsync` / `applyFaceDecalTextureAsync`
generan la textura final con sprites, y `exportGLBToBuffer` espera
`decalTextureReady` antes de exportar. `buildFaceDecalPart` emite layers sprite
con canvas `128×128`, `NearestFilter`, `sprite` y `tint` persistidos.

Validado con `npx playwright test tests/e2e/face-decal-generator.spec.js --project=smoke --reporter=line -g "composes sprite"`,
`npx playwright test tests/e2e/face-decal-generator.spec.js --project=smoke --reporter=line -g "sprite faceDecal"`,
`npx playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke --reporter=line -g "expanded avatar hair and facial sweeps"`,
`npx playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke --reporter=line -g "Mii placement sliders"`,
`npm run check` y `npm run build`.

**Contexto:** `renderDecalLayers` (`texture-generator.js`) hoy dibuja formas;
debe pasar a componer sprites. La colocación NO cambia.

**Pasos:**
1. Extender el spec de capa del decal: `{ kind, sprite: 'eye_oval', side, x, y,
   w, h, tint: { iris: '#...' } }`. Si `sprite` está presente se usa
   `drawImage` (con espejado horizontal para side R); si no, fallback al
   dibujo procedural actual (se mantiene como respaldo, coste cero).
2. `buildFaceDecalPart` (avatar-builder.js): mapear presets de ojo/boca/ceja a
   ids de sprite (tabla en el catálogo de presets, no heurística de strings
   como `resolveDecalEyeStyle` — sustituirla).
3. Subir la resolución del canvas del decal si hace falta (los sprites de 32px
   necesitan ~96–128px de canvas para no perder detalle; mantener
   NearestFilter para el look pixelado).
4. Round-trip: guardar/cargar escena y export GLB con sprites (el spec del
   decal ya se serializa; verificar que `sprite`+`tint` viajan).

**Criterio de éxito:** sweep de cabezas con ojos sprite estilo OoT legibles;
save/load y GLB conservan la cara.

## H2.4 [DELEGABLE] Presets de catálogo → sprites

**✅ HECHO.** `AVATAR_EYE_PRESETS`, `AVATAR_MOUTH_PRESETS` y
`AVATAR_BROW_PRESETS` declaran `spriteId` desde tablas explícitas en sus
catálogos. `buildFaceDecalPart` consume esos `spriteId` y ya no decide estilos
por heurística de strings sobre el id del preset. `scripts/check-avatar-sprites.mjs`
falla si algún preset facial no-`none` no declara un sprite válido del tipo
correcto.

Validado con `node ./scripts/check-avatar-sprites.mjs`, `npm run check` y
`npm run build`.

**Pasos:** actualizar `AVATAR_EYE_PRESETS`, `AVATAR_MOUTH_PRESETS`,
`AVATAR_BROW_PRESETS` (en `src/data/avatar/catalog/`) para que cada preset
declare su `spriteId`. Los sliders Mii existentes (size/offset/spacing) no
cambian. Actualizar el test de placement si asertaba sobre estilos
procedurales.

---

# FASE H0 — Demolición de las cabezas viejas (breaking change)

**⚠️ Ejecutar SOLO cuando H1.1–H1.4 estén en verde.** Orden dentro de la fase:
H0.1 → H0.2 → H0.3.

## H0.1 [DELEGABLE] Migración de recetas guardadas

**✅ HECHO.** `avatar-recipe.js` migra `headMoldId`/`headMeshId` legacy a
presets generados (`cabezon` → `gen_head_chibi`, `duro` →
`gen_head_square`, `gordo` → `gen_head_broad`, normal/white/desconocidos
→ `gen_head_heroic`). Las cargas de localStorage/import JSON avisan con el
toast i18n `avatarHeadMigratedToast` cuando se normaliza una cabeza vieja o
desconocida. La persistencia e2e cubre escenas guardadas con ID legacy y con
ID desconocido sin errores de consola.

**Contexto:** recetas en localStorage/escenas JSON referencian ids de cabeza
viejos (`headMoldId`/`headMeshId` tipo `psx_mesh_portrait_cabezon_175`).

**Pasos:**
1. Localizar dónde se resuelve la cabeza de una receta
   (`avatar-recipe.js` / `avatar-builder.js` — buscar el fallback actual
   cuando un id no existe).
2. Tabla de migración: id viejo → preset generado más parecido (cabezon →
   `gen_head_chibi`, gordo → `gen_head_broad`, duro → `gen_head_square`,
   normal/white → `gen_head_heroic` — confirmar visualmente con capturas).
3. Al cargar receta/escena con id desconocido: aplicar tabla, si no hay
   entrada → preset por defecto + toast avisando "cabeza migrada al nuevo
   sistema" (i18n ES+EN).
4. Test: cargar una escena guardada con id viejo produce el avatar migrado
   sin errores de consola.

## H0.2 [DELEGABLE] Borrado físico

**✅ HECHO.** Se borraron los 7 JSON de cabezas manuales y
`scripts/derive-head-landmarks.mjs`. `head-meshes.js` registra solo los 8
presets generados, `head-molds.js` expone solo `gen_head_*`, los bundles/specs
activas apuntan a `gen_head_heroic`, y `docs/HEADS.md` / `ask-head.md` documentan
el contrato de spec paramétrico. El barrido legacy queda limpio en `src/`,
`scripts/`, `tests/`, docs actuales y specs activas. Validado con
`npm run audit:avatar-styles`, `node ./scripts/check-generated-heads.mjs`,
tests e2e enfocados de mold-mode/placement, `npm run check` y `npm run build`.

**Pasos (con `npm run check` + suites de avatar tras cada bloque):**
1. `git rm src/data/avatar/heads/*.json` (las 7 mallas).
2. `head-meshes.js`: eliminar imports y entradas del mapa; dejar solo el
   adaptador de cabezas generadas (H1.1c).
3. `head-molds.js`: eliminar los molds `psx_mesh_portrait_*` viejos.
4. `scripts/derive-head-landmarks.mjs`: borrar (solo servía para estampar
   landmarks en mallas manuales) y quitar del package.json si aparece.
5. Grep de barrido: `grep -rn "cabezon\|gordo175\|gordo275\|duro175\|duro250\|normal175\|white_mesh" src scripts tests docs` → cero resultados en src/ y scripts/ (en docs históricos puede quedar mención con nota).
6. `docs/HEADS.md` y `ask-head.md`: reescribir mínimamente — las cabezas ya no
   se piden a un LLM como malla, se piden como SPEC de parámetros del
   generador (contrato nuevo, 10 números en vez de 1.400 líneas de vértices).
   Esto es una mejora enorme para generación por IA: documentarlo así.

**Criterio de éxito:** clon limpio compila; cero referencias; suites verdes.

## H0.3 [DELEGABLE] Baseline y changelog

**✅ HECHO.** Sweeps regenerados y versionados en
`docs/baselines/2026-07-03-heads-v2/` (24 capturas de `gen_head_*` + 18 de
cuerpos). `CHANGELOG.md` documenta el breaking change Heads v2 y `newtask.md`
marca que la parte de cabezas de la Fase 4 queda sustituida por este documento.
Validado con los sweeps `CAPTURE_HEADS` / `CAPTURE_BODIES`, `npm run check` y
`npm run build`.

**Pasos:** regenerar sweeps → `docs/baselines/<fecha>-heads-v2/`; anotar el
breaking change en `CHANGELOG.md` (qué se borró, cómo migran las recetas);
marcar en `newtask.md` que la parte de cabezas de la Fase 4 queda sustituida
por este documento.

---

# FASE H3 — Rasgos 3D (nariz, orejas, pelo) sobre cráneos generados

## H3.1 [DELEGABLE + revisión FABLE] Auditoría de nariz/orejas

**✅ HECHO.** `npm run audit:avatar-nose-ears` barre 8 cráneos generados ×
5 narices y 3 orejas (64 casos), escribe métricas en
`.tmp-head-views/audit/nose-ear-report.json` y genera 64 capturas locales en
`.tmp-head-views/audit/nose-ear-captures/` para revisión visual. La revisión
H3.1 no detectó piezas hundidas/flotantes ni escala fuera de rango; no hizo
falta ajustar presets.

Validado con `npm run audit:avatar-nose-ears`, `npm run check` y
`npm run build`.

**Contexto:** las piezas 3D de nariz/oreja existentes se montan por landmarks,
así que EN TEORÍA funcionan sobre los cráneos nuevos sin cambios.

**Pasos:** sweep con cada preset generado × cada preset de nariz y oreja;
revisar capturas: escala relativa correcta (factor interocular ya existe),
sin hundirse en la malla ni flotar. Ajustar solo los presets que fallen
(deltas relativos a interocular, nunca offsets por cabeza — esa era la trampa
del sistema viejo).

## H3.2 [DELEGABLE] Casco de pelo sobre topología generada

**✅ HECHO.** `npm run audit:avatar-hair` audita los 8 cráneos generados ×
15 presets de pelo (120 casos) y confirma los 5 estilos internos del casco
(`bowl`, `cap`, `buzz`, `spikes`, `ponytail`). La auditoría comprueba que la
malla del casco es finita/cerrada, con escala y cobertura razonables contra la
cabeza, y genera 40 capturas locales en
`.tmp-head-views/audit/hair-helmet-captures/` para revisión visual de los 5
estilos × 8 cráneos. No hizo falta ajustar `hair-helmet.js`.

Validado con `npm run audit:avatar-hair`, `npm run check` y `npm run build`.

**Contexto:** `hair-helmet.js` recorta el cuero cabelludo de la malla real.
Con cráneos de anillos regulares el recorte debería ser MÁS limpio que antes.

**Pasos:** ejecutar los 5 estilos de pelo × 8 presets de cráneo; si el corte
hairline→nuca falla con la topología nueva, ajustar la detección usando los
anillos (el generador puede etiquetar qué anillo es la hairline — coordinarlo
con H1.1 si hace falta, es un campo más en la salida del generador).

**Criterio de éxito:** los 5 estilos envuelven cualquier preset sin agujeros
ni atravesar la frente.

---

# FASE H4 — Cierre

## H4.1 [DELEGABLE] Auditoría visual completa en `npm run check`

**✅ HECHO.** `npm run check` ejecuta `npm run audit:avatar-visual`, que ahora
audita 8 cráneos generados × bundle por defecto con métricas
rasgo-vs-landmark, cuello/cabeza y cuerpos, limpia `.tmp-head-views/audit/`,
captura cada cabeza de frente y perfil (16 PNG), mantiene las 12 capturas de
cuerpo y copia la hoja de contacto de sprites a
`.tmp-head-views/audit/sprites/h2.2-contact-sheet.png`. El script falla en
rojo si las métricas salen de tolerancia, si faltan capturas de cabeza o si la
hoja de contacto de sprites no existe/es inválida.

Validado con `npm run audit:avatar-visual`, `npm run check` y `npm run build`.

Actualizar `scripts/avatar-visual-audit.mjs` + helper e2e para cubrir: 8
presets × bundle por defecto de frente/perfil, rasgo-vs-landmark en tolerancia,
y captura de contacto de sprites. Falla en rojo si algo se sale.

## H4.2 [FABLE] Benchmark final

Reconstruir la cabeza del héroe élfico (`n64_elf_hero_cm`) con un preset
generado + sprites y compararla con la actual. Si el héroe v2 no es igual o
mejor que el v1, iterar parámetros/sprites antes de dar la fase por cerrada.
Actualizar `ideas.md` con las conclusiones del nuevo sistema.

---

## Qué se descarta definitivamente con este plan

- Las 7 mallas de cabeza manuales y su tooling (`derive-head-landmarks.mjs`).
- La heurística de estilos por nombre de preset (`resolveDecalEyeStyle` y
  hermanas) — sustituida por mapeo explícito preset→sprite.
- Cualquier resto de offsets manuales por cabeza que aparezca durante H0.2.

## Qué NO se toca (base estable)

Cuerpos generados y sus proporciones, rig HUMANOID_STANDARD y clips, montaje
por landmarks, decal curvado con muestreo de malla, casco de pelo, sliders
Mii, export GLB, Motion Ripper congelado.

---

# ESTADO (2026-07-02 noche) y FASE H5 — Rasgos con profundidad

**Hecho por Codex:** H1.1c, H1.2, H1.3, H1.4, H2.1–H2.4, H0.1–H0.3, H3.1, H3.2, H4.1.
**Hecho por Fable:** H1.1 (generador), fix de tintes de paleta (`66421da`: iris/lip/hairDark
no llegaban a los sprites) y decal shrink-wrap 5×4, y el flake de bootstrap de
Playwright (reintento con timeout 20 s en `helpers/app.js`).
**Pendiente:** H4.2 (benchmark del héroe, FABLE) — queda aplazado hasta cerrar H5,
porque el sistema de rasgos cambia otra vez con esta fase.

## Por qué H5 (decisión de diseño, 2026-07-02)

Los rasgos como textura sobre un decal que "abraza" la superficie funcionan de
frente, pero son frágiles: si la estimación de superficie falla unos milímetros,
el rasgo se entierra en la cabeza o flota. Decisión del usuario (+1 de Fable):
**ojos, cejas y boca pasan a ser piezas 3D finas (losetas/slabs) con profundidad
propia, parcialmente EMBEBIDAS en el cráneo**. Es lo que hacían los juegos N64
reales (Banjo, Mario 64: ojos = geometría encajada en la cabeza). Ventajas:
tolerante a errores de superficie (aunque se hunda un poco, sigue viéndose),
lee bien de perfil (relieve real), y los sliders Mii se vuelven simple
translación 3D. El atlas de sprites SE CONSERVA: cada sprite pasa a ser la
textura de la cara frontal de su loseta.

## H5.1 [CODEX] Losetas de rasgo (`buildFeatureSlabParts`)

**✅ HECHO.** `buildFeatureSlabParts(resolved, headGeometryEntry)` genera
`EYE_SLAB_L/R`, `BROW_SLAB_L/R` y `MOUTH_SLAB` como losetas 3D con textura
sprite individual, grosor `0.18·io` y protrusión auditada entre 20% y 60% del
grosor. El montaje usa las landmarks y `sampleMeshMaxDepth`, mantiene sliders
Mii (`size`, `offsetX/Y`, `spacing`) sobre las mismas recetas y conserva la ruta
`buildFaceDecalPart` solo como fallback temporal. La ceja queda a `eyeY +
0.40·io` en vez de `0.28·io` porque con ojos cuadrados `0.52·io` la proporción
original solapaba físicamente ceja y ojo.

Validado con `npm run build`, `node ./scripts/check-avatar-sprites.mjs`,
`npx playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke
--reporter=line --timeout=180000 -g "applies Mii"`,
`npx playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke
--reporter=line --timeout=180000 -g "defines readable mold feature bundles"`,
`npx playwright test tests/e2e/avatar-forge-mold-mode.spec.js --project=smoke
--reporter=line --timeout=180000 -g "canonical mesh head"`,
`npx playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke
--reporter=line --timeout=180000 -g "skull sliders"`, `npm run
audit:avatar-visual` y `npm run check`.

**Contexto:** sustituye el FACE_DECAL de rejilla en
`src/modules/avatar/avatar-builder.js` por 5 piezas independientes:
`EYE_SLAB_L`, `EYE_SLAB_R`, `BROW_SLAB_L`, `BROW_SLAB_R`, `MOUTH_SLAB`.

**Geometría de cada loseta:** prisma rectangular (caja, 12 triángulos, formato
`customGeometry` vertices/faces como el decal actual). Dimensiones en unidades
de interocular (io = distancia eyeL–eyeR):

- Ojo: ancho 0.52·io · escala, alto = ancho (sprite 32×32).
- Ceja: ancho 0.54·io · escala, alto = ancho/3 (sprite 48×16).
- Boca: ancho 0.62·io · escala, alto = ancho/2 (sprite 48×24).
- **Profundidad de todas: 0.18·io** (en una cabeza de 10 cm ≈ 1.8 cm).

**Colocación (el corazón de la tarea):**

1. Posición x/y = landmark (eyeL/eyeR/mouth; cejas = eyeY + 0.28·io) + offsets
   de sliders (reusar `placementOffset`; spacing separa ojos y cejas en x).
2. Profundidad: `surfaceZ` = `sampleMeshMaxDepth(meshVertices, x ± anchoLoseta/2,
   y ± alto/2, fallback landmarkZ)` (la función ya existe). La cara FRONTAL de
   la loseta queda en `surfaceZ + 0.35 · profundidad` — es decir, ~65% del
   grosor embebido en la cabeza y ~35% sobresaliendo. Así siempre se ve aunque
   la superficie real varíe.
3. Sin rotaciones en v1 (la placa facial de los cráneos generados mira a +Z
   por construcción).

**Textura:** cada loseta lleva `decal` con UNA capa: `{ kind, sprite, side,
tint, x: 0.5, y: 0.5, w: 0.96, h: 0.96 }`, resolución 32×32 (ojo), 48×16
(ceja), 48×24 (boca). El pipeline existente (`applyFaceDecalTexture` +
`applyGeneratedCustomUvs`) proyecta el sprite en las caras frontal/trasera y
estira los píxeles del borde por los laterales (look de píxel extruido, es lo
que queremos). `alphaTest` ya se activa con `piece.decal`. El material de la
pieza usa color skin de la paleta (los laterales visibles donde el sprite es
transparente quedan color piel).

**Pasos:**
1. Implementar `buildFeatureSlabParts(resolved, headGeometryEntry)` devolviendo
   las 5 piezas; mantener `buildFaceDecalPart` tras un flag
   (`state.useFeatureSlabs = true` por defecto) hasta validar; luego borrarlo.
2. Sliders: size→escala de loseta; offsetX/offsetY→translación x/y;
   spacing→separación simétrica de ojos y cejas. Persisten igual en
   `avatarRecipe` (no cambiar el formato de receta).
3. Retarget del test de placement (`avatar-forge-placement.spec.js`): medir
   bounding boxes 3D de las losetas (MÁS fácil que las fracciones del canvas:
   los deltas de slider son translaciones directas). Aserción nueva
   anti-enterramiento: `frontZ(loseta) > surfaceZ(malla en su banda)`.
4. Auditoría visual (helper + `scripts/avatar-visual-audit.mjs`): rasgo dentro
   de tolerancia de su landmark en x/y; protrusión entre 0.2 y 0.6 de la
   profundidad de loseta; capturas de las 8 cabezas.
5. Persistencia + GLB round-trip (las losetas son CUSTOM+decal: ya soportado;
   verificar con un save/load y un export).
6. `npm run check` + suites de avatar. Commit.

**Criterio de éxito:** las 8 cabezas × bundle por defecto muestran ojos/cejas/
boca nítidos de frente Y con relieve visible de perfil/tres-cuartos; mover
sliders nunca entierra un rasgo (la aserción lo garantiza); check verde.

## H5.2 [CODEX] Limpieza post-losetas — ✅ HECHO

Tras validar H5.1: borrar `buildFaceDecalPart`, la rejilla shrink-wrap, el flag,
y el dibujo procedural de ojos/cejas/boca en `texture-generator.js`
(`drawEyeLayer`/`drawBrowLayer`/`drawMouthLayer` y estilos) SI ya ningún
template los usa (grep antes; `n64_cover_mascot_v2_cm` usa FACE_CARD con
textura serializada, no procedural — no tocarlo). Actualizar `ask.md` (sección
faceDecal → losetas) y `docs/HEADS.md`.

**Validacion:** eliminado `buildFaceDecalPart`, el flag `useFeatureSlabs`, la
rejilla shrink-wrap y los renderers procedurales de ojos/cejas/boca. Los
templates legacy que aun usan `FACE_DECAL` declaran capas `sprite` con
`flipY: false`; `ask.md`, `ask-character.md` y `docs/HEADS.md` documentan
losetas/sprite-only. `rg` no encuentra estilos procedurales fuera del historial
de tareas; `check-ask-character-example` pasa.

## H5.3 [CODEX] Ampliación del atlas de sprites — ✅ HECHO

Mismo método que el set v1 que ya funciona (pixel art limpio, contorno #111111
de 1px, fondo transparente, placeholders EXACTOS: iris `#ff00ff`, labio
`#00ff00`, ceja `#0000ff`; actualizar `sprites-manifest.json` y el test del
manifest). El estilo de referencia es Ocarina/Majora: formas grandes, legibles
a 32px y a la mitad.

**Ojos (32×32, dibujar lado izquierdo; el motor espeja el derecho):**
- `eye_round_big` — ojo circular ENORME estilo niño OoT: contorno grueso, iris
  grande (#ff00ff) ocupando ~60%, brillo blanco de 2px arriba-izquierda.
- `eye_almond` — almendrado apuntando ligeramente arriba-afuera, iris medio.
- `eye_happy_closed` — cerrado feliz: arco ∩ de 2px, sin iris (tintSlots {}).
- `eye_sad_closed` — cerrado triste: arco ∪ de 2px, sin iris.
- `eye_wink` — párpado a media asta horizontal + media luna de iris debajo.
- `eye_surprised` — círculo blanco grande, iris diminuto centrado (4px).
- `eye_side_glance` — blanco ovalado con iris pegado al borde exterior.
- `eye_heart` — iris con forma de corazón (todo #ff00ff, se tiñe entero).
- `eye_robot` — ojo cuadrado, iris cuadrado, línea de scanline de 1px.

**Cejas (48×16):**
- `brow_worried` — inclinada hacia arriba en el lado interior (preocupación).
- `brow_arch` — arco curvado fino (elegante/sorpresa).
- `brow_zigzag` — zigzag de 2 picos (enfado cómico).
- `brow_thin` — línea fina de 2px casi recta.

**Bocas (48×24):**
- `mouth_grin_teeth` — sonrisa ancha abierta con fila de dientes BLANCOS
  (el blanco no se tiñe; el interior #00ff00).
- `mouth_ooh` — "o" pequeña y redonda (sorpresa/canto).
- `mouth_cat` — boca de gato :3 (dos arcos).
- `mouth_tongue` — sonrisa con lengua fuera (lengua también #00ff00).
- `mouth_sad_open` — abierta hacia abajo (llanto cómico).
- `mouth_smirk` — sonrisa ladeada ASIMÉTRICA (respetar flag side del motor).
- `mouth_neutral_small` — línea corta de 2px.

Añadir los presets correspondientes a los catálogos (eye/brow/mouth-presets)
con sus `spriteId`, i18n de labels ES+EN, y pasar la auditoría visual.

**Validacion:** `scripts/draw-sprites.mjs` genera 34 sprites versionados y una
hoja de contactos multilínea (`docs/avatar-sprites/h2.2-contact-sheet.png`) con
15 ojos, 12 bocas y 7 cejas. Los presets nuevos declaran `spriteId` y
`labels.en/es`; la UI usa esas labels según idioma. Pasan
`node ./scripts/check-avatar-sprites.mjs`, `face-decal-generator.spec.js`,
`smoke.spec.js`, `npm run check` y `npm run build`.

## H5.4 [FABLE] Benchmark final (absorbe H4.2) — ✅ HECHO

Cuando H5.1–H5.3 estén en verde: reconstruir el héroe élfico con cráneo
generado + losetas + sprites nuevos, iterar hasta que iguale o supere al v1,
regenerar baselines y actualizar `ideas.md` con conclusiones del sistema.

**Validación:** `n64_elf_hero_cm` usa un cráneo generado y cinco losetas
sprite-backed (`EYE_SLAB_L/R`, `BROW_SLAB_L/R`, `MOUTH_SLAB`) sin `FACE_DECAL`.
El benchmark versiona capturas front/profile/three-quarter en
`docs/baselines/2026-07-04-elf-hero-h5/`. Pasan
`tests/e2e/n64-elf-hero.spec.js`, `tests/e2e/character-model-face-decals.spec.js`,
`npm run check` y `npm run build`. `ideas.md` recoge la conclusión: las losetas
con ~0.18 interocular de profundidad, parcialmente embebidas, son más fáciles de
ajustar y leer que una cara plana.

# FASE H6 — Biblioteca facial y benchmarks de profundidad

## H6.1 [CODEX] Presets de profundidad para losetas faciales — ✅ HECHO

**Contexto:** H5.4 demostró que ojos/cejas/boca no deberían ser planos. El
grosor actual funciona, pero está codificado como una proporción única. Queremos
convertirlo en contrato explícito para que cada personaje pueda afinar cuánto se
incrusta y cuánto sobresale sin romper la lectura frontal.

**Validación:** `src/modules/avatar/avatar-builder.js` expone
`FEATURE_SLAB_DEPTH_PRESETS` con `flat_safe`, `default_embedded`,
`toy_extruded` y `mask_plate`; los moldes generados seleccionan
`default_embedded` desde catálogo, sin cambiar el formato público de receta. Cada
loseta guarda `presetId`, `depthFactor`, `surfaceZ`, `frontZ`, `depth`,
`protrusionRatio` y `sidePadding`. `avatar-visual-audit` verifica que el ratio
`(frontZ - surfaceZ) / depth` queda entre 20% y 60%, y
`avatar-forge-placement.spec.js` comprueba que los presets cambian profundidad
sin romper los sliders x/y.

**Pasos:**
1. Localizar el montaje de `buildFeatureSlabParts` y extraer constantes
   nombradas para `depthFactor`, `frontProtrusionRatio`, `sidePadding` y
   `materialSkinFallback`.
2. Añadir presets internos: `flat_safe` (poco relieve), `default_embedded`
   (actual), `toy_extruded` (más relieve) y `mask_plate` (más plano y ancho).
   No cambiar el formato público de receta todavía; seleccionarlos desde specs o
   defaults de catálogo.
3. Añadir auditoría numérica: para cada loseta, `frontZ - surfaceZ` debe quedar
   entre 20% y 60% de su profundidad salvo preset explícito.
4. Actualizar tests de placement para comprobar que los sliders siguen moviendo
   x/y sin alterar la protrusión esperada.
5. Regenerar capturas de las 8 cabezas con el preset por defecto y guardar solo
   las que sirvan como baseline de QA.

**Criterio de éxito:** cambiar de preset modifica el perfil visible de los
rasgos sin enterrarlos ni separarlos de la cabeza; `npm run audit:avatar-visual`,
`npm run check` y `npm run build` en verde.

## H6.2 [CODEX] Atlas facial v3: expresiones legibles y tintables — ✅ HECHO

**Contexto:** continuar el método que ya funciona: pixel art limpio, script
regenerable, PNGs versionados, hoja de contactos revisable a 100% y 50%. Mantener
contorno oscuro 1px, fondo transparente, blanco puro en ojos/dientes, iris
placeholder `#ff00ff`, labio/lengua/interior tintable `#00ff00`, ceja tintable
`#0000ff`. Estética Ocarina/Majora: siluetas grandes, expresivas y no realistas.

**Validación:** `scripts/draw-sprites.mjs` genera 62 sprites versionados y
actualiza `src/data/avatar/sprites/sprites-manifest.json` junto a
`docs/avatar-sprites/h2.2-contact-sheet.png`. H6.2 añade 10 ojos, 8 cejas y 10
bocas con placeholders exactos, presets ES/EN y entradas en `style-library`.
Hoja de contacto revisada visualmente a tamaño normal y reducida: las siluetas
siguen separándose por tipo. Pasan `node ./scripts/check-avatar-sprites.mjs` y
`tests/e2e/face-decal-generator.spec.js`.

**Ojos nuevos (32×32, dibujar lado izquierdo; el motor espeja el derecho):**
- `eye_sleepy_lid` — óvalo medio cerrado con párpado pesado, iris visible solo en
  la mitad inferior, expresión cansada pero simpática.
- `eye_sharp_hero` — ojo angular de héroe, blanco triangular suavizado, iris
  centrado-pequeño, lectura seria sin parecer enfado.
- `eye_dot_tiny` — punto negro/iris mínimo dentro de blanco muy pequeño, estilo
  NPC cómico; debe seguir viéndose a 50%.
- `eye_big_sparkle` — ojo grande con iris `#ff00ff`, dos brillos blancos y borde
  oscuro limpio; versión más bonita que `eye_round_big`.
- `eye_downcast` — ojo mirando abajo, iris pegado a la zona inferior, párpado
  superior marcado.
- `eye_masked_slit` — ranura horizontal para personajes misteriosos, sin blanco
  grande; iris `#ff00ff` como línea corta.
- `eye_button` — ojo circular tipo botón cosido, con cruz de 1px en `#ff00ff`
  para tintar.
- `eye_diamond` — blanco en rombo suave, iris romboidal centrado, fantasía/elfo.
- `eye_old_wrinkle` — ojo pequeño con dos píxeles de arruga lateral en contorno
  oscuro; no usar gris semitransparente.
- `eye_blank_glow` — blanco puro sin iris, contorno oscuro, pensado para fantasmas
  o magia; `tintSlots {}`.

**Cejas nuevas (48×16):**
- `brow_soft_curve` — curva suave y gruesa, neutral amable.
- `brow_heroic_slope` — ceja ancha que baja hacia el interior, decidida.
- `brow_sad_inner_up` — interior alto y exterior bajo, tristeza/preocupación.
- `brow_double_dash` — dos segmentos cortos separados, estilo cartoon.
- `brow_bushy_round` — ceja poblada con extremos redondeados, 4px de grosor.
- `brow_elder` — ceja larga caída con cola exterior descendente.
- `brow_villain_hook` — arco alto con gancho final hacia abajo, villano teatral.
- `brow_tiny_dot` — ceja mínima de 2-3 píxeles para cabezas pequeñas.

**Bocas nuevas (48×24):**
- `mouth_soft_smile` — sonrisa pequeña, un arco limpio de 2px, amable y neutra.
- `mouth_wide_hero_grin` — sonrisa confiada con dientes blancos separados por
  contorno oscuro mínimo.
- `mouth_pursed` — boca pequeña fruncida, forma de rombo/óvalo horizontal.
- `mouth_talk_side` — boca abierta asimétrica para frame de habla, interior
  `#00ff00`, una comisura más alta.
- `mouth_laugh_open` — abierta grande con forma de media luna, dientes superiores
  blancos y hueco tintable.
- `mouth_big_frown` — ceño triste grande, arco invertido grueso y legible.
- `mouth_beard_gap` — boca corta pensada para quedar bajo bigote/barba, sin
  dientes, mucho aire alrededor.
- `mouth_serious_cut` — línea recta con una comisura baja, personaje serio.
- `mouth_surprised_square` — boca cuadrada pequeña, estilo reacción N64.
- `mouth_mischief_tooth` — sonrisa ladeada con un diente blanco triangular.

**Pasos:**
1. Extender `scripts/draw-sprites.mjs` con las recetas anteriores; no dibujar a
   mano sprites sueltos que no pueda regenerar el script.
2. Guardar PNGs en `src/data/avatar/sprites/` y actualizar
   `sprites-manifest.json`.
3. Añadir presets de catálogo con `spriteId`, `labels.en`, `labels.es` y tint
   slots coherentes.
4. Regenerar `docs/avatar-sprites/h2.2-contact-sheet.png` con filas legibles por
   tipo y revisar visualmente a 100% y 50%.
5. Ejecutar `node ./scripts/check-avatar-sprites.mjs`, tests de decal generator,
   `npm run check` y `npm run build`.

**Criterio de éxito:** todos los sprites se distinguen en la hoja de contactos a
100% y a 50%, las variantes tintables mantienen placeholders exactos, y los
presets aparecen en la UI con labels ES/EN.

## H6.3 [FABLE] Galería benchmark de personajes clave — ✅ HECHO

**Contexto:** el héroe élfico ya sirve como métrica norte, pero una sola cara no
detecta regresiones en villager/guard/mascotas. Crear una galería pequeña evita
volver a arreglar un personaje rompiendo otro.

**Validación:** `tests/e2e/character-benchmark-gallery.spec.js` valida cuatro
benchmarks (`n64_elf_hero_cm`, `n64_simple_villager_cm`, `psx_slim_guard_cm`,
`n64_cover_mascot_v2_cm`) y captura front/profile/three-quarter con
`CAPTURE_CHARACTER_BENCHMARK=1`. Las capturas versionadas viven en
`docs/baselines/2026-07-05-character-benchmark-h6/`. La cámara infiere el frente
desde `FACE_DECAL` o losetas para no capturar la espalda en plantillas que miran
a `-Z`. `ideas.md` documenta qué riesgo visual cubre cada personaje.

**Pasos:**
1. Definir una lista inicial de benchmarks: `n64_elf_hero_cm`,
   `n64_simple_villager_cm`, `psx_slim_guard_cm` y una mascota N64.
2. Crear script o test Playwright que capture front/profile/three-quarter para
   cada uno en una carpeta temporal estable.
3. Añadir checks mínimos por personaje: cabeza visible, facciones presentes,
   ninguna loseta enterrada, orejas/sombrero/pelo dentro de proporciones
   esperadas si existen.
4. Versionar una carpeta `docs/baselines/<fecha>-character-benchmark/` solo
   cuando el set completo se revise visualmente.
5. Documentar en `ideas.md` qué personaje queda como referencia para cada riesgo:
   facciones, pelo, orejas, casco, perfil, ropa.

**Criterio de éxito:** una sola orden produce la galería y falla si algún
benchmark pierde facciones, queda enterrado o cambia de escala de forma obvia.

## H6.4 [CODEX] Contrato LLM para elegir facciones con losetas — ✅ HECHO

**Contexto:** los LLMs deben pedir rasgos por `spriteId` y presets compactos, no
inventar geometría facial ni restaurar `FACE_DECAL`.

**Validación:** `ask.md` y `ask-character.md` ya explican la ruta preferida:
cráneo generado + presets con `spriteId` + losetas de rasgo con profundidad real.
`ask-character.md` incluye un ejemplo compacto de Avatar Forge con
`gen_head_heroic`, pelo, ojos/cejas/boca con `spriteId`, tint slots y
`featureSlabDepthPresetId: "default_embedded"`. El validador
`scripts/check-ask-character-example.mjs` comprueba ese ejemplo nuevo contra los
catálogos reales, rechaza `FACE_DECAL` en personajes nuevos y también rechaza
capas decal procedurales (`style`) en los ejemplos legacy. Pasan
`node ./scripts/check-ask-character-example.mjs`, `npm run check` y
`npm run build`.

**Pasos:**
1. Actualizar `ask.md` y `ask-character.md` con ejemplos de ojos/cejas/bocas
   usando `spriteId`, tint slots y preset de profundidad.
2. Añadir un ejemplo completo de personaje con cráneo generado + losetas + pelo,
   sin vértices manuales de cabeza.
3. Añadir validador o test de ejemplo que rechace `FACE_DECAL` procedural en
   personajes nuevos y recomiende losetas.
4. Incluir una tabla corta de "elige este sprite si quieres esta emoción" para
   ayudar a modelos baratos.
5. Ejecutar `node ./scripts/check-ask-character-example.mjs`, `npm run check` y
   `npm run build`.

**Criterio de éxito:** un prompt nuevo puede producir un personaje con facciones
legibles usando solo cráneo generado, losetas, `spriteId`s y tint slots.

# FASE H7 — Volumen facial controlado y atlas v4

## H7.1 [CODEX] Profundidad real por proporción de cabeza — ✅ HECHO

**Contexto:** la idea del usuario es correcta: si una cabeza fuese de 10 cm,
ojos/cejas/boca no deberían ser pegatinas planas; deberían tener algo como
1.5-2 cm de volumen, con la mayor parte embebida en el cráneo y la cara frontal
siempre visible. Hoy ya existen losetas con profundidad, pero el contrato aún se
expresa sobre todo por interocular y preset interno.

**Validación:** `FEATURE_SLAB_DEPTH_PRESETS` ahora declara `headDepthRatio`,
`embeddedRatio`, `frontProtrusionRatio` y descripción humana. Con malla de cráneo
generada, `default_embedded` usa 18% de la profundidad real de cabeza; si una
cabeza mide 10 cm de frente a nuca, la loseta mide ~1.8 cm, con ~65% dentro del
cráneo y ~35% visible. `depthFactor` queda como fallback para geometrías sin
profundidad medible. La auditoría visual comprueba profundidad positiva, cara
frontal por delante de la superficie, 40-80% de volumen embebido y ratio
15-22% para `default_embedded`. `docs/HEADS.md` incluye la tabla de ratios reales
de los 8 cráneos generados actuales.

Pasan `playwright test tests/e2e/avatar-forge-placement.spec.js --project=smoke`,
`npm run audit:avatar-visual`, `npm run check` y `npm run build`.

**Pasos:**
1. Medir en runtime `headDepth` local o global para cada cráneo generado y
   comparar con `interocular`; documentar el ratio real de las cabezas actuales.
2. Extender `FEATURE_SLAB_DEPTH_PRESETS` con metadatos legibles para humanos:
   `headDepthRatio`, `embeddedRatio`, `frontProtrusionRatio` y descripción visual.
3. Mantener `default_embedded` como preset por defecto, apuntando a un relieve
   aproximado de 15-22% de la profundidad de cabeza cuando el cráneo lo permita.
4. Añadir asserts al audit visual: profundidad positiva, 40-80% del volumen dentro
   de la cabeza, cara frontal siempre por delante de la superficie.
5. Actualizar `docs/HEADS.md`, `ask.md` y `ask-character.md` con la regla de
   proporción en lenguaje simple.
6. Ejecutar `npm run audit:avatar-visual`, `npm run check` y `npm run build`.

**Criterio de éxito:** las losetas tienen una profundidad entendible por ratio de
cabeza, no se entierran, no flotan y siguen leyendo bien en front/profile/3-4.

## H7.2 [CODEX] Herramientas de ajuste visual para losetas

**Contexto:** ahora algunos rasgos son difíciles de ajustar cuando el usuario no
ve qué parte de la loseta está dentro de la cabeza. Necesitamos depurar volumen,
protrusión y anclaje sin volver a offsets mágicos por preset.

**Pasos:**
1. Añadir un modo debug opcional para Avatar Forge que muestre bounding boxes o
   wireframes de `EYE_SLAB_*`, `BROW_SLAB_*` y `MOUTH_SLAB`.
2. Mostrar en diagnostics por loseta: `surfaceZ`, `frontZ`, `depth`,
   `frontProtrusionRatio`, preset activo y sprite activo.
3. Añadir controles compactos solo si hacen falta: selector de preset de
   profundidad por cabeza o por receta, no sliders libres por cada rasgo.
4. Capturar una mini galería debug de front/profile/3-4 para al menos
   `gen_head_heroic`, `gen_head_chibi`, `gen_head_square` y `gen_head_wide_jaw`.
5. Añadir test Playwright que active el modo debug y verifique que todos los
   overlays se dibujan sin romper la selección normal.
6. Ejecutar `npm run audit:avatar-visual`, test específico, `npm run check` y
   `npm run build`.

**Criterio de éxito:** ajustar facciones deja de ser a ciegas: se ve la loseta, su
volumen y su protrusión, y los controles siguen siendo compactos.

## H7.3 [CODEX] Atlas facial v4: más emociones sin perder legibilidad

**Contexto:** ampliar el vocabulario visual manteniendo el método que funcionó en
H6.2: sprites pixel art generados por código en `scripts/draw-sprites.mjs`,
versionados como PNG y revisados en hoja de contacto a 100% y 50%.

**Ojos nuevos (32×32, lado izquierdo; el motor espeja el derecho):**
- `eye_leaf_elf` — ojo almendrado largo con punta exterior suave, iris `#ff00ff`
  pequeño, lectura élfica/aventura sin parecer enfadado.
- `eye_hooded_n64` — ojo con párpado superior pesado y blanco reducido, serio y
  sobrio para adultos N64.
- `eye_wide_wonder` — ojo redondo abierto con iris grande y dos brillos blancos,
  sorpresa amable.
- `eye_sly_side` — ojo mirando de lado, iris desplazado y párpado bajo, picardía.
- `eye_cross_sleep` — ojo cerrado con X suave de 1px, para mareo/sueño cartoon.
- `eye_tiny_button_glint` — botón pequeño con un único brillo blanco, NPC simple.
- `eye_goggle_round` — aro oscuro redondo con lente blanca e iris `#ff00ff`,
  mecánico/aviador.
- `eye_cat_slit` — ojo vertical de gato, iris `#ff00ff` como ranura, fantasía.
- `eye_square_guard` — ojo cuadrado bajo casco, blanco rectangular e iris mínimo.
- `eye_teary` — ojo oval con brillo grande inferior, tristeza sin exagerar.
- `eye_hollow_mask` — hueco oscuro con borde claro mínimo, máscara/monstruo.
- `eye_upper_lash_soft` — óvalo amable con 2-3 pestañas exteriores limpias.

**Cejas nuevas (48×16):**
- `brow_knit_center` — dos masas que se juntan en el centro, preocupación intensa.
- `brow_high_arch` — arco alto limpio, sorpresa/elegancia.
- `brow_low_heavy` — ceja baja y gruesa, mirada dura.
- `brow_short_worry` — trazo corto inclinado hacia arriba por dentro.
- `brow_split_scar` — ceja partida por un hueco diagonal, personaje curtido.
- `brow_round_thick_soft` — ceja gruesa redondeada, amable y muy legible.
- `brow_elf_sweep` — ceja larga barrida hacia fuera, elegante/élfica.
- `brow_flat_micro` — línea mínima para cabezas muy pequeñas.
- `brow_angry_block` — bloque angular descendente hacia el interior.
- `brow_question_tilt` — una ceja con inclinación curiosa, duda/sospecha.

**Bocas nuevas (48×24):**
- `mouth_small_smirk` — sonrisa corta ladeada, sin dientes.
- `mouth_nervous_wiggle` — línea ondulada pequeña, nervios.
- `mouth_hero_teeth_short` — sonrisa compacta con dientes blancos, menos ancha
  que `mouth_wide_hero_grin`.
- `mouth_elder_moustache_gap` — hueco corto pensado para bigote/barba, muy bajo.
- `mouth_open_triangle` — boca triangular pequeña, grito/reacción N64.
- `mouth_duck_pout` — boca fruncida redonda-horizontal, comic.
- `mouth_side_fang` — sonrisa ladeada con colmillo pequeño.
- `mouth_flat_tired` — línea plana con esquinas caídas.
- `mouth_soft_o` — O pequeña redondeada, sorpresa suave.
- `mouth_big_cheer` — boca abierta feliz con dientes superiores.
- `mouth_mask_line` — línea mínima casi sin expresión, máscara/robot.
- `mouth_grit_square` — dientes apretados en rectángulo pequeño.

**Pasos:**
1. Extender `scripts/draw-sprites.mjs` con estas recetas; no añadir PNGs a mano.
2. Regenerar `src/data/avatar/sprites/*.png`,
   `src/data/avatar/sprites/sprites-manifest.json` y
   `docs/avatar-sprites/h2.2-contact-sheet.png`.
3. Añadir presets en `eye-presets.js`, `brow-presets.js`, `mouth-presets.js` y
   `style-library.js` con labels ES/EN y `spriteId`.
4. Revisar visualmente la hoja de contacto a 100% y 50%; corregir cualquier sprite
   que se confunda con otro.
5. Ejecutar `node ./scripts/check-avatar-sprites.mjs`, test de decal generator,
   `npm run check` y `npm run build`.

**Criterio de éxito:** el atlas gana expresiones nuevas sin perder lectura a 50%,
todos los placeholders tintables son exactos y cada sprite aparece en catálogo.

## H7.4 [CODEX] Benchmark visual H7 de profundidad + atlas

**Contexto:** después de tocar profundidad y sprites, hay que bloquear regresiones
con una galería pequeña que mezcle cráneos, cuerpos, emociones y pelo.

**Pasos:**
1. Crear 6 recetas benchmark: héroe serio, NPC cute, anciano, villano, robot y
   máscara/fantasma.
2. Cada receta debe usar cráneo generado, pelo o accesorio visible, y una
   combinación distinta de ojos/cejas/boca por `spriteId`.
3. Capturar front/profile/3-4 con el mismo estilo que H6.3 en una carpeta
   versionada `docs/baselines/<fecha>-character-benchmark-h7/`.
4. Añadir checks de presencia: cinco losetas, ninguna enterrada, sprite aplicado,
   pelo/accesorio dentro de bounds y cabeza visible.
5. Documentar en `ideas.md` qué benchmark cubre cada riesgo.
6. Ejecutar test específico, `npm run check` y `npm run build`.

**Criterio de éxito:** la galería demuestra que el volumen facial y el atlas v4
funcionan juntos en varios roles sin reintroducir `FACE_DECAL` nuevo.
