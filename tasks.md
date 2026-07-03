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
y 50%.

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

**Pasos:** regenerar sweeps → `docs/baselines/<fecha>-heads-v2/`; anotar el
breaking change en `CHANGELOG.md` (qué se borró, cómo migran las recetas);
marcar en `newtask.md` que la parte de cabezas de la Fase 4 queda sustituida
por este documento.

---

# FASE H3 — Rasgos 3D (nariz, orejas, pelo) sobre cráneos generados

## H3.1 [DELEGABLE + revisión FABLE] Auditoría de nariz/orejas

**Contexto:** las piezas 3D de nariz/oreja existentes se montan por landmarks,
así que EN TEORÍA funcionan sobre los cráneos nuevos sin cambios.

**Pasos:** sweep con cada preset generado × cada preset de nariz y oreja;
revisar capturas: escala relativa correcta (factor interocular ya existe),
sin hundirse en la malla ni flotar. Ajustar solo los presets que fallen
(deltas relativos a interocular, nunca offsets por cabeza — esa era la trampa
del sistema viejo).

## H3.2 [DELEGABLE] Casco de pelo sobre topología generada

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
