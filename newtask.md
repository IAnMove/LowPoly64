# newtask.md — Roadmap: personajes PSX/N64 de verdad

Objetivo del proyecto en una frase: **que un LLM pueda generar personajes 3D con look
PSX/N64 real (tipo Link de Ocarina), animarlos con clips reutilizables entre cuerpos
estándar, y que el editor de caras tipo Mii sea simple y fiable.**

Diagnóstico que justifica este roadmap (leer antes de empezar):

Los personajes actuales parecen Minecraft por una razón concreta y arreglable: **se
construyen apilando cajas alineadas a los ejes**. Los personajes N64/PSX reales (Link,
Mario, Cloud) se construyen con: (1) volúmenes **ahusados** (más estrechos en un extremo:
antebrazos, muslos, torso trapezoidal), (2) **la cara pintada como textura/decal**, no como
geometría (los ojos de Link son una textura sobre el cráneo, no esferas), y (3) sombreado
por vertex colors. El proyecto ya tiene el 70% de la infraestructura (custom mesh, vertex
colors, landmarks, moldes generados, auditorías visuales); lo que falta es el vocabulario
de geometría ahusada y el sistema de caras-decal. Ese es el eje de las fases 1 y 2.

**Orden de ejecución: Fase 0 → 1 → 2 → 4 → 3.** (La 4 antes que la 3 porque los decals
de la fase 1 desbloquean el editor de caras, y la animación necesita los moldes v2 de la
fase 2 estables.) Dentro de cada fase, las tareas van en orden.

---

## Trampas globales (leer SIEMPRE antes de tocar código)

1. **Alias del rig humanoide** (`src/modules/viewport/templates.js`, `HUMANOID_NODE_ALIASES`):
   NUNCA nombrar piezas decorativas `SHOULDER_L/R`, `PAULDRON_*`, `CLAVICLE_*`, `WAIST`,
   `LEFT_SHOULDER`. El normalizador reparenta y un nombre coincidente crea un ciclo que
   desmonta el brazo (síntoma: warning `Animation target ARM_L not found in group`).
   Usar sufijos: `ARM_L_PAD`, `TORSO_WAIST`.
2. **`faceColors` es un ARRAY de 6 hex** (orden back/front/left/right/top/bottom según
   `TRI_FACES`). Para moldes generados se hornea desde la paleta con `makeFaceColors(baseColor)`
   de `src/data/templates/generated-character-molds.js`.
3. **Precedencia de color** (`resolvePaletteColorToken` en `src/modules/avatar/avatar-builder.js`):
   reglas por nombre de pieza (HAND/NECK→skin, FOOT→accent, PELVIS→bodySecondary, `_PAD`→bodyPrimary,
   BELT/COLLAR/RIBBON→accent) van ANTES que `slotColorMap[slotId]`. No reordenar.
4. **Sweeps de captura** (PowerShell 5.1, sin `&&`):
   - Cabezas: `$env:CAPTURE_HEADS='1'; npx playwright test avatar-head-capture --reporter=line` → `.tmp-head-views/avatars/`
   - Cuerpos: `$env:CAPTURE_BODIES='1'; npx playwright test avatar-body-capture --reporter=line` → `.tmp-head-views/bodies/`
5. Dentro de `page.evaluate` NO funciona `import('three')` ni existe `state.THREE`. Para
   bounding boxes en mundo copiar el patrón de `tests/e2e/avatar-body-capture.spec.js`.
6. **Flake de arranque**: si falla el bootstrap del server de Playwright, re-ejecutar una vez
   antes de buscar bugs.
7. **Validación estándar de toda tarea**: `npm run check` + `npm run build` en verde, más
   las suites que indique la tarea. Commit con mensaje descriptivo (nunca "work in progress"),
   terminando con `Co-Authored-By:` del modelo.
8. Antes de cada tarea: `git status` limpio. Si hay cambios ajenos a tu tarea, parar y avisar.

---

# FASE 0 — Sanear la base

## T0.1 — Cerrar el working tree pendiente

**Contexto:** hay ~120 ficheros modificados sin commitear en `fable/fixing_problems`
(README, index.html, openspec, docs…). Trabajar encima de eso contamina cualquier tarea.

**Pasos:**
1. `git status` y `git diff --stat`. Agrupar los cambios por tema (docs, openspec, UI).
2. Si los cambios son coherentes con el trabajo reciente de Avatar Forge, commitearlos en
   1–3 commits temáticos con mensajes descriptivos. Si algo parece accidental (p. ej.
   cambios masivos de whitespace), revertirlo con `git checkout -- <fichero>`.
3. Verificar que `npm run check` y `npm run build` pasan tras cada commit.

**Criterio de éxito:** `git status` limpio, check y build en verde.

## T0.2 — Limpiar basura del repo

**Contexto:** `.tmp-chrome-svg/` contiene un perfil entero de Chrome (miles de ficheros),
hay logs `.tmp-*.log` y capturas sueltas que no deben vivir en el árbol de trabajo.

**Pasos:**
1. Confirmar que nada en `src/` ni `scripts/` importa desde `.tmp-chrome-svg/`
   (`grep -r "tmp-chrome" src scripts tests` debe dar 0 resultados; si hay alguno, parar y avisar).
2. Borrar `.tmp-chrome-svg/`, los `.tmp-*.log` y `.tmp-*.err.log` de la raíz.
3. Asegurar que `.gitignore` cubre `.tmp*` y `tmp/`. Verificar con `git status` que nada
   trackeado se ha borrado (si algún log estaba trackeado: `git rm --cached`).
4. `npm run check`, `npm run build`, commit.

**Criterio de éxito:** raíz del repo sin directorios temporales, build en verde.

## T0.3 — Congelar el retargeting universal de Motion Ripper

**Contexto:** es la decisión 1.1–1.3 de `task.md` (leerla entera). El retargeting a modelos
arbitrarios no funciona por diseño (ejes locales distintos por template) y no se va a
iterar más. Se conserva solo: captura → rig canónico → export de clip.

**Archivos:** `src/modules/animation/motion-ripper-ui.js` (botón "import into current model"),
`src/modules/animation/motion-ripper-retargeting.js`, `src/modules/animation/capture-skinned-character.js`.

**Pasos:**
1. Localizar el flujo del botón de importar al modelo seleccionado.
2. Deshabilitarlo salvo que el grupo seleccionado declare `skeletonId: "HUMANOID_STANDARD"`
   con bindings completos (usar `getSkeletonById` de `src/modules/animation/skeleton-registry.js`
   y los bindings del grupo). Cuando no aplique, mostrar un mensaje claro en la UI (i18n en
   `src/modules/shared/i18n.js`, ES+EN) explicando que el modelo debe usar el rig estándar.
3. NO borrar código de retargeting todavía (se decide en T3.4).
4. Crear `docs/motion-ripper-freeze.md` con: qué se congeló, por qué (resumir el diagnóstico
   del Problema 1 de `task.md`), y el criterio de reevaluación (tras migrar moldes a
   HUMANOID_STANDARD en Fase 3).
5. Marcar 1.1, 1.2, 1.3 y 1.5 como hechas en `task.md`. Validar, commit.

**Criterio de éxito:** con un template cualquiera seleccionado el botón está deshabilitado
con mensaje; con un modelo HUMANOID_STANDARD sigue funcionando; check en verde.

## T0.4 — Documentar el contrato de esqueleto canónico

**Contexto:** conviven 3 contratos de huesos (`HUMANOID_DEFAULT`, `HUMANOID_CAPTURE`,
`HUMANOID_STANDARD`) unidos por aliases. Todo lo nuevo (Fases 2 y 3) se construye SOLO
sobre `HUMANOID_STANDARD`. Esta tarea no migra nada: fija el contrato por escrito para
que las siguientes tareas no improvisen.

**Archivos:** `src/data/skeletons/humanoid_standard.json`, `src/modules/animation/skeleton-registry.js`,
`src/data/templates/generated-character-molds.js`.

**Pasos:**
1. Leer `humanoid_standard.json` y listar: nombres de hueso, jerarquía, y qué rest pose asume.
2. Escribir `docs/SKELETON.md` con: (a) tabla de huesos y jerarquía; (b) convención de ejes
   locales por hueso (qué eje apunta a lo largo del hueso, cuál al frente) — si hoy no está
   definida, DEFINIRLA aquí (recomendado: Y a lo largo del hueso hacia el hijo, Z al frente,
   rest pose en A-pose); (c) convención de nombres de piezas por hueso (`ARM_L`, `FOREARM_L`,
   `HAND_L`, etc.) y la lista negra de nombres del punto 1 de trampas globales; (d) qué es
   `slotBindings` y un ejemplo completo copiado de un mold generado.
3. Declarar en el doc: `HUMANOID_DEFAULT` y `HUMANOID_CAPTURE` quedan como legacy,
   prohibido usarlos en contenido nuevo.
4. Commit (solo docs, sin cambios de código).

**Criterio de éxito:** un LLM que solo lea `docs/SKELETON.md` puede nombrar correctamente
las piezas de un personaje nuevo y saber qué skeletonId declarar.

## T0.5 — Baseline visual de referencia

**Contexto:** las fases siguientes cambian geometría. Sin un "antes" congelado no se puede
juzgar el "después".

**Pasos:**
1. Ejecutar los dos sweeps de captura (trampa global 4).
2. Copiar las capturas a `docs/baselines/2026-07/` (front/profile de cada cabeza y cuerpo).
3. Añadir `docs/baselines/README.md` explicando qué son y con qué commit se generaron.
4. Commit.

**Criterio de éxito:** carpeta versionada con ~30 PNG y su README.

---

# FASE 1 — Vocabulario de geometría PSX/N64

Esta fase es el corazón del proyecto. Añade las 3 primitivas que separan "cajas Minecraft"
de "low-poly N64", y el sistema de cara-decal.

## T1.1 — Primitiva `taperedBox` (caja ahusada / frustum)

**Contexto:** el 80% de un cuerpo N64 son cajas con la tapa superior de distinto tamaño que
la inferior: torso (hombros anchos → cintura estrecha), muslos, antebrazos, botas.

**Archivos:** `src/modules/viewport/custom-geometries.js` (crear la geometría aquí),
`src/modules/viewport/primitives.js` (case nuevo), `src/modules/viewport/json-import.js`
(validación de params), `index.html` + `src/modules/shared/i18n.js` (botón/label si las
primitivas tienen UI de spawn; mirar cómo está hecho `wedge`).

**Especificación:**
```
type: "taperedBox"
params: {
  widthBottom, depthBottom,   // tamaño de la base
  widthTop, depthTop,         // tamaño de la tapa
  height,
  offsetTopX = 0, offsetTopZ = 0   // desplazar la tapa (para hombros caídos, botas)
}
```
8 vértices, 12 triángulos, origen en el centro de la base (y=0 abajo, como convenga al
patrón existente de `wedge` — comprobarlo y ser consistente). Debe soportar `faceColors`
(6 colores, mismo orden que cube) y `vertexColors`.

**Pasos:**
1. Estudiar cómo `wedge` y `pyramid` están implementados de punta a punta (geometría,
   validación, export GLB, persistencia) y replicar el patrón.
2. Implementar la geometría con normales planas (no suavizar).
3. Validación en `json-import.js`: todos los params numéricos finitos, dimensiones > 0.
4. Test: añadir un caso a la suite existente que cubra json-import (buscar tests de
   `wedge`/`custom` y clonar). Verificar export GLB y save/load de escena con un taperedBox.
5. `npm run check`, build, commit.

**Criterio de éxito:** puedo importar por JSON un taperedBox con faceColors, guardarlo,
recargarlo y exportarlo a GLB sin errores; el test nuevo pasa.

## T1.2 — Primitiva `limbLoft` (tubo seccionado ahusado)

**Contexto:** la primitiva estrella. Un brazo o pierna de Ocarina es un tubo de 6–8 lados
con 2–4 secciones donde cada sección tiene su radio y su desplazamiento (codo doblado,
pantorrilla más gruesa). También sirve para torsos redondeados y colas.

**Archivos:** los mismos que T1.1.

**Especificación:**
```
type: "limbLoft"
params: {
  sides: 6,                       // 4–10
  sections: [                     // 2–8 anillos, de abajo arriba
    { y: 0.0, radiusX: 0.12, radiusZ: 0.10, offsetX: 0, offsetZ: 0 },
    { y: 0.5, radiusX: 0.09, radiusZ: 0.08, offsetX: 0, offsetZ: 0.02 },
    { y: 1.0, radiusX: 0.11, radiusZ: 0.09, offsetX: 0, offsetZ: 0 }
  ],
  capTop: true, capBottom: true
}
```
Genera anillos de `sides` vértices en cada sección, los une con quads triangulados, tapas
como fans. Normales planas. `radiusZ` opcional (default = radiusX). Soporte `vertexColors`
(array por vértice ya validado en `vertex-colors.js`) y un color base.

**Pasos:**
1. Implementar geometría + validación (sections ordenadas por y creciente, radios > 0,
   sides entre 4 y 10, máx 8 secciones).
2. Mismo ciclo de test/validación que T1.1.
3. Añadir 2 ejemplos de uso a un JSON de prueba en `tests/` (un brazo doblado, una pierna).

**Criterio de éxito:** igual que T1.1, y visualmente un brazo hecho con limbLoft de 6 lados
se ve "N64" y no "caja".

## T1.3 — Primitiva `lathe` (revolución de perfil)

**Contexto:** cráneos, gorros, jarrones, hombreras redondas, faldas. Un perfil 2D girado
en 6–8 segmentos.

**Especificación:**
```
type: "lathe"
params: {
  points: [[r, y], ...],   // 3–12 puntos, y creciente
  segments: 8               // 4–12
}
```
Puede apoyarse en `THREE.LatheGeometry` + conversión a normales planas (`toNonIndexed` +
`computeVertexNormals` plano), o generarse a mano como T1.2. Preferir a mano para controlar
el conteo de triángulos y el soporte de vertexColors.

**Pasos:** mismo ciclo que T1.1/T1.2.

**Criterio de éxito:** una "seta" de prueba (sombrero lathe + tronco cylinder) importada por
JSON se ve correcta con flat shading.

## T1.4 — Sistema de cara-decal (`faceDecal`)

**Contexto:** la conclusión de `docs/mario64-head-limitations.md` y la clave del look N64:
ojos/cejas/boca como **textura pintada en un quad** pegado a la cara, no como geometría.
Ya existe un precedente (`FACE_CARD` con textura serializada en `n64_cover_mascot_v2_cm`).
Esta tarea lo convierte en sistema de primera clase.

**Archivos:** `src/modules/texture/texture-generator.js` (generación procedural),
`src/modules/viewport/json-import.js`, `src/modules/avatar/avatar-builder.js` (consumo en
Fase 4, aquí NO tocarlo), persistencia de texturas (`src/modules/shared/textures.js` — ver
cómo se serializan las texturas pintadas hoy).

**Especificación (pieza en template/JSON):**
```
{
  "name": "FACE_DECAL",
  "geometry": { "type": "plane", "params": { "width": 0.5, "height": 0.3 } },
  "decal": {
    "resolution": [64, 32],           // texturas pequeñas, estilo N64
    "layers": [
      { "kind": "eye", "side": "L", "style": "oval", "iris": "#3a6ea5", "x": 0.30, "y": 0.45, "w": 0.16, "h": 0.22 },
      { "kind": "eye", "side": "R", "style": "oval", "iris": "#3a6ea5", "x": 0.70, "y": 0.45, "w": 0.16, "h": 0.22 },
      { "kind": "brow", "side": "L", "color": "#5a3d2b", "x": 0.30, "y": 0.28, "w": 0.18, "h": 0.05, "angle": -8 },
      { "kind": "mouth", "style": "smile", "color": "#7a3b2e", "x": 0.5, "y": 0.78, "w": 0.25, "h": 0.08 }
    ],
    "background": "transparent"
  }
}
```
El generador pinta las capas en un canvas (formas simples: óvalos, rects redondeados, arcos),
crea una `CanvasTexture` con `NearestFilter` (pixelado retro) y material transparente.
Estilos mínimos v1: eye `oval|halfmoon|dot|angry`, mouth `smile|flat|open|frown`,
brow `flat|angled`. La textura debe **persistirse** con la escena y **exportarse** en el GLB
(reutilizar el mecanismo existente de texturas pintadas).

**Pasos:**
1. Estudiar cómo `n64_cover_mascot_v2_cm` serializa su FACE_CARD y cómo texturas pintadas
   viajan a save/load y GLB hoy.
2. Implementar el generador de capas en canvas (función pura: `renderDecalLayers(spec) → canvas`).
3. Integrar en json-import: si una pieza trae `decal`, generar la textura y aplicarla.
4. Regenerar la textura al re-importar/cargar (guardar el spec, no solo el PNG, para que
   sea editable; el PNG serializado es el fallback).
5. Tests: import + save/load + export GLB con un decal; test unitario del generador
   (dimensiones, transparencia).
6. Documentar el formato en `ask.md` (sección nueva "faceDecal").

**Criterio de éxito:** un cubo con un faceDecal delante se ve como una cara N64 pixelada,
sobrevive a guardar/cargar y aparece en el GLB exportado.

## T1.5 — Actualizar el contrato LLM (`ask.md`)

**Contexto:** `ask.md` es el prompt que usan LLMs externos para generar objetos. Debe
enseñar las primitivas nuevas o nadie las usará.

**Pasos:**
1. Añadir a `ask.md`: especificación + rangos válidos + UN ejemplo completo y bueno de cada
   primitiva nueva (taperedBox, limbLoft, lathe, faceDecal).
2. Añadir una sección "cómo NO parecer Minecraft": preferir taperedBox a cube en torso y
   extremidades; extremidades con limbLoft de 6 lados; caras con faceDecal, nunca ojos de
   esferas; máximo ~800 triángulos por personaje.
3. Probar el prompt en frío: pedir a un LLM (o construir a mano siguiendo solo el doc) un
   objeto con cada primitiva e importarlo. Corregir el doc donde falle.
4. Commit.

**Criterio de éxito:** un JSON generado siguiendo solo `ask.md` importa sin errores de
validación a la primera.

---

# FASE 2 — Personajes: moldes v2 y el "test Link"

## T2.1 — Regenerar los builders de moldes con las primitivas nuevas

**Contexto:** `src/data/templates/generated-character-molds.js` genera los cuerpos
(chibi/heroic/slim/heavy + n64) con cajas. Hay que migrar sus builders (`makeChestMesh`,
`makeLimbMesh`, `handPiece`, etc.) a taperedBox/limbLoft manteniendo ids, nombres de
pieza, slotBindings y paleta.

**Pasos:**
1. Capturar el estado actual (sweep CAPTURE_BODIES) como referencia inmediata.
2. Migrar builder a builder, empezando por `makeLimbMesh` → limbLoft de 6 lados con
   ahusado (antebrazo más estrecho en muñeca, muslo más ancho arriba, pantorrilla con
   ligera curva). Después torso → taperedBox u loft (hombros más anchos que cintura;
   en heavy al revés). Hombros caídos con `offsetTop`.
3. NO cambiar nombres de piezas ni jerarquía (los rigs y colores dependen de ellos;
   trampas globales 1–3).
4. Tras cada builder migrado: sweep de cuerpos + suites
   `npx playwright test avatar-forge-mold-mode avatar-forge-placement --reporter=line`.
5. Comparar contra `docs/baselines/2026-07/`. El criterio visual: silueta de perfil con
   ahusados visibles, ninguna extremidad es un ortoedro puro.
6. `npm run check`, commit por builder o por par de moldes.

**Criterio de éxito:** los 6 moldes renderizan con extremidades y torso ahusados, suites
16/16, check verde, capturas antes/después guardadas en la PR/commit.

## T2.2 — Tabla de proporciones por molde con test

**Contexto:** los personajes N64 respetan proporciones fuertes (Link adulto ≈ 6.5 cabezas,
Link niño ≈ 4, chibi ≈ 3). Hoy las proporciones son artesanales. Fijarlas por spec evita
regresiones y da a los LLMs números concretos.

**Pasos:**
1. Definir en `generated-character-molds.js` (o un `mold-proportions.js` nuevo) por molde:
   altura total, cabezas de alto, anchura de hombros en anchos-de-cabeza, longitud
   brazo/pierna como fracción de la altura, tamaño de mano y pie.
2. Derivar los specs de los builders desde esa tabla donde sea razonable (no forzar).
3. Test e2e o de nodo que construya cada molde y verifique las medidas con bounding boxes
   (patrón de la trampa global 5), tolerancia ±10%.
4. Documentar la tabla en `docs/character-molds-plan.md`.

**Criterio de éxito:** test de proporciones en verde e integrado en `npm run check`.

## T2.3 — Personaje bandera: héroe élfico tipo Link (el test de aceptación)

**Contexto:** ESTA es la tarea que valida todo lo anterior. Construir UN personaje completo
estilo héroe de Ocarina (túnica, cinturón, botas, gorro puntiagudo, pelo, cara decal) sobre
el molde heroic + cabeza mesh + rig HUMANOID_STANDARD. No es "un template más": es el
benchmark. Nombre id: `n64_elf_hero_cm` (NO usar nombres/marcas de Nintendo en el id ni
en textos visibles).

**Pasos:**
1. Partir del molde `psx_heroic` generado (post-T2.1). Vestirlo: túnica = taperedBox/loft
   sobre el torso, cinturón = pieza fina accent, botas = taperedBox con offsetTop, guantes.
2. Cabeza: usar una cabeza mesh existente (p. ej. `normal175`) + faceDecal para ojos
   grandes estilo N64 + orejas puntiagudas como geometría (2 pirámides/wedges) + gorro
   puntiagudo (lathe o loft doblado) + flequillo con `hair-helmet.js` o geometría propia.
3. Respetar nombres de pieza del contrato (`docs/SKELETON.md`) para que el rig funcione.
4. Iterar con capturas front/profile/three-quarter hasta que la silueta "lea" como héroe
   élfico N64 a tamaño miniatura (bajar el zoom: si a 128px de alto se reconoce, está bien).
5. Aplicarle un clip existente (idle o walk del sistema actual) y verificar que se anima
   sin desmontarse.
6. Añadirlo al registro de templates y a la auditoría visual. Commit con capturas.

**Criterio de éxito:** captura three-quarter que un humano reconoce como "héroe élfico
estilo N64" sin que se lo digan; se anima; check verde. **Si tras 3–4 iteraciones sigue
pareciendo Minecraft, PARAR y reportar qué primitiva/capacidad falta** en vez de forzar.

## T2.4 — `ask-character.md`: contrato LLM para personajes completos

**Contexto:** replicar el patrón que ya funciona (`ask.md`, `ask-head.md`) para personajes
enteros. Escribirlo DESPUÉS de T2.3 para destilar lo aprendido.

**Pasos:**
1. Crear `ask-character.md` con: estructura de grupo esperada, jerarquía y nombres de pieza
   por hueso (tabla de `docs/SKELETON.md`), lista negra de nombres, skeletonId y
   slotBindings obligatorios, tabla de proporciones (T2.2), reglas anti-Minecraft (T1.5),
   presupuesto de triángulos, paleta (faceColors desde paleta), y un ejemplo COMPLETO
   pequeño (un aldeano simple, no el héroe) que valide.
2. Probar en frío igual que T1.5, con 2 personajes de estilos distintos.
3. Los que salgan bien, añadirlos como templates.

**Criterio de éxito:** un LLM externo genera un personaje válido e importable a la primera,
que se anima con un clip estándar.

## T2.5 — Auditoría visual de personajes en `npm run check`

**Contexto:** es la tarea 2.7 de `task.md`, extendida a cuerpos. Sin gate automático,
cada cambio de geometría rompe caras/cuerpos en silencio.

**Pasos:**
1. Extender `scripts/avatar-visual-audit.mjs` (o crear `character-visual-audit.mjs`) para:
   renderizar cada molde y cada cabeza×bundle por defecto, comprobar por bounding box que
   cada rasgo cae a menos de una tolerancia de su landmark (reutilizar la matemática de
   `avatar-forge-placement.spec.js`), y que las proporciones de T2.2 se cumplen.
2. Guardar screenshots en `.tmp-head-views/audit/` para inspección manual.
3. Integrarlo en `npm run check` con salida clara de qué rasgo/molde falla.
4. Commit.

**Criterio de éxito:** romper adrede un offset (p. ej. bajar los ojos 0.2) hace fallar
`npm run check` con mensaje útil; restaurado, pasa.

---

# FASE 4 — Editor de caras tipo Mii (v2, sin empezar de cero)

**Decisión (razonada en `ideas.md`):** NO reescribir desde cero. El núcleo reciente
(cabezas mesh + landmarks 3D + `buildLandmarkMountPlan`) es justo la "idea eficaz simple y
limpia" que buscabas y está validado con tests. Lo que está mal y SE SUSTITUYE: los rasgos
como placas SVG proyectadas (look "Mii plano" + tablas de offsets manuales por molde) y la
UI acumulada de `avatar-ui.js`. Lo que se conserva: cabezas, landmarks, recipe, hair-helmet.

## T4.1 — Ojos/cejas/boca como decals sobre la cabeza

**Contexto:** sustituir las placas SVG de ojos/cejas/boca por el sistema faceDecal (T1.4)
proyectado sobre el cráneo. Nariz y orejas siguen siendo geometría (correcto en N64).

**Archivos:** `src/modules/avatar/avatar-builder.js` (`buildLandmarkMountPlan`),
`src/modules/avatar/avatar-head-svg.js`, `src/modules/svg/svg-head-integration.js`,
catálogos en `src/data/avatar/catalog/`.

**Pasos:**
1. Generar un único quad-decal de cara por avatar: tamaño = f(interocular del landmark),
   posicionado entre `eyeL/eyeR/mouth`, ligeramente despegado de la superficie (evitar
   z-fighting; probar 0.5–1% del alto de cabeza, o material `polygonOffset`).
2. Mapear los presets actuales de ojos/cejas/boca a specs de capas del decal (estilo,
   color de iris, etc.). Empezar con 4 ojos, 3 bocas, 2 cejas; ampliar después.
3. Los sliders Mii (size/up-down/left-right/spacing de `recipe.features[].placement`)
   pasan a mover las capas DENTRO del decal (coordenadas 0–1 del canvas), no geometría.
   Esto elimina medio problema de montaje 3D.
4. Mantener la ruta SVG vieja tras un flag (`state.useDecalFace = true` por defecto)
   durante esta fase; se borra en T4.3.
5. Sweep CAPTURE_HEADS de las 7 cabezas × bundle por defecto, comparar con baseline:
   los ojos ya no deben ser bultos 3D saltones.
6. Ajustar `avatar-forge-placement.spec.js` a la nueva realidad (los gaps se miden ahora
   en el spec del decal, que es más simple y determinista).

**Criterio de éxito:** las 7 cabezas con cara decal se ven más "N64 auténtico" que la
baseline (capturas lado a lado en el commit), sliders funcionan, tests verdes.

## T4.2 — Eliminar las tablas de offsets manuales por preset/molde

**Contexto:** `MESH_PORTRAIT_PART_PRESET_OFFSETS` y afines en
`src/data/avatar/catalog/head-molds.js` son el coste combinatorio (7 cabezas × N presets
ajustados a mano). Con decals + landmarks dejan de ser necesarios.

**Pasos:**
1. Buscar todos los consumidores de esas tablas (`grep -rn "PART_PRESET_OFFSETS" src tests`).
2. Sustituir por: posición base = landmarks de cada head.json; variación = spec del decal
   + sliders del usuario. Para nariz/orejas (geometría), el preset puede declarar un delta
   RELATIVO a la interocular (un número por preset, no por preset×molde).
3. Borrar las tablas. Ejecutar auditoría visual (T2.5) sobre las 7 cabezas.
4. Commit con capturas.

**Criterio de éxito:** `grep PART_PRESET_OFFSETS` da 0 resultados; auditoría visual verde
en las 7 cabezas sin ajustes manuales por molde.

## T4.3 — Borrar la ruta SVG legacy de rasgos y simplificar la UI

**Contexto:** con T4.1 estable, la ruta de placas SVG de ojos/cejas/boca sobra, y
`avatar-ui.js` (960 líneas) + `avatar-form-controls.js` acumulan controles de dos épocas.

**Pasos:**
1. Quitar el flag de T4.1 y borrar el código de placas SVG de rasgos faciales (ojos, cejas,
   boca). OJO: `svg-extrusion.js` y la importación SVG general NO se tocan (sirven para
   otras cosas); solo la proyección de rasgos faciales.
2. Reorganizar el panel del avatar en 3 bloques tipo Mii: (1) Cabeza y cuerpo (molde,
   cabeza, paleta), (2) Cara (decal: ojos/cejas/boca + sliders), (3) Pelo y extras (casco
   de pelo, nariz, orejas, accesorios). Generar los controles desde el catálogo
   declarativamente (patrón que ya usa `populateSelect`), sin casos especiales por rasgo.
3. Si al terminar `avatar-ui.js` supera ~500 líneas, extraer submódulos por bloque.
4. `npm run audit:code-size`, suites de avatar, check, commit.

**Criterio de éxito:** panel funcional con los 3 bloques, sin ruta SVG de rasgos, código
del avatar reducido (comparar `audit:code-size` antes/después), tests verdes.

## T4.4 — Sliders del casco de pelo

**Contexto:** limitación conocida (task.md 2.5): los sliders no afectan al pelo procedural
de `hair-helmet.js`.

**Pasos:**
1. Exponer en `hair-helmet.js` 3 parámetros: volumen (grosor de la carcasa), hairline
   (desplazar el borde frontal arriba/abajo), largo (extensión de nuca/coleta).
2. Conectarlos a los sliders existentes del bloque Pelo (mapear size→volumen,
   up-down→hairline, un slider nuevo o reutilizado→largo). Persistir en `avatarRecipe`.
3. Test en `avatar-forge-placement.spec.js`: cambiar volumen cambia el bounding del pelo.
4. Sweep de cabezas, check, commit.

**Criterio de éxito:** mover sliders de pelo cambia visiblemente el casco en las 7 cabezas
sin atravesar el cráneo (la carcasa siempre envuelve el scalp).

## T4.5 — Integración avatar completo

**Contexto:** rematar: que cabeza editada + cuerpo molde formen un personaje coherente
listo para animar.

**Pasos:**
1. Verificar la unión cuello-cabeza en los 6 moldes × 7 cabezas (muestreo: 12 combinaciones):
   sin huecos ni cabezas flotantes. Arreglar en el punto de montaje del builder si falla.
2. Slider de escala de cabeza (rango 0.85–1.4) en el bloque Cabeza y cuerpo, persistido.
3. El avatar completo declara `skeletonId: HUMANOID_STANDARD` + bindings (preparación
   directa de la Fase 3).
4. Auditoría visual completa, check, commit.

**Criterio de éxito:** cualquier combinación cabeza×cuerpo×paleta produce un personaje
sin huecos que acepta un clip de animación estándar.

---

# FASE 3 — Animación portable entre cuerpos estándar

## T3.1 — Los moldes generados emiten HUMANOID_STANDARD completo

**Contexto:** hoy los moldes declaran contratos mixtos. A partir de aquí, todo molde
generado sale de fábrica con `skeletonId: "HUMANOID_STANDARD"` y `slotBindings` completos
derivados automáticamente del spec (no a mano).

**Pasos:**
1. En `generated-character-molds.js`, derivar los bindings de la tabla de piezas del spec
   (cada builder sabe qué piezas crea para qué hueso; hacerlo explícito en el spec).
2. Verificar contra `docs/SKELETON.md`: pivots de hombro/codo/cadera/rodilla en las juntas
   REALES de la geometría (con limbLoft las juntas están definidas por las secciones;
   colocar el pivot en el anillo correspondiente).
3. Todos los pivots con la misma convención de ejes locales (la definida en T0.4). Esta es
   LA condición que hace los clips portables; ser estricto.
4. Test: para cada molde, verificar programáticamente que existen todos los huesos del
   esqueleto, que la jerarquía coincide y que los ejes de reposo cumplen la convención.
5. Suites de avatar + check, commit.

**Criterio de éxito:** test de conformidad de rig en verde para los 6 moldes.

## T3.2 — Formato de clip estándar + librería base

**Contexto:** con rigs idénticos en convención, un clip es solo "curvas por nombre de hueso
estándar" y se aplica 1:1 sin retargeting.

**Pasos:**
1. Definir `clip.json`: nombre, duración, loop, tracks por hueso estándar (rotaciones;
   posición solo para `ROOT`/`HIPS`), keyframes con easing. Revisar el formato de animación
   JSON existente (`src/modules/animation/animation-import.js`, `ask-animation.md`) y
   EXTENDERLO en vez de inventar otro si encaja.
2. La única adaptación permitida al aplicar: escalar la translación de HIPS/ROOT por el
   ratio de longitud de pierna del esqueleto destino (medible del rig). Rotaciones nunca
   se adaptan.
3. Crear 5 clips base a mano o con el capturador canónico: idle, walk, run, wave, jump.
   Guardarlos en `src/data/animations/` como assets versionados.
4. Test: aplicar `walk` a chibi y a heroic; verificar que ambos animan sin warnings de
   targets y que los pies no se hunden (tolerancia en y).
5. Actualizar `ask-animation.md` al formato final. Check, commit.

**Criterio de éxito:** los 5 clips corren en los 6 moldes y en el héroe de T2.3 sin
retargeting y sin desmontar nada.

## T3.3 — UI: aplicar clips a cualquier modelo estándar

**Pasos:**
1. En el modo animación (`anim-mode-ui.js`), botón/selector "aplicar clip de librería" para
   cualquier grupo con rig estándar conforme (validar con el test de T3.1 en runtime).
2. Mensaje claro si el modelo no es conforme (reutilizar el patrón del gate de T0.3).
3. Export GLB de modelo + clips seleccionados verificado en un visor externo
   (three.js editor o https://gltf-viewer.donmccurdy.com).
4. Check, commit.

**Criterio de éxito:** flujo completo en UI: spawn molde → aplicar walk → export GLB → se
ve animado en un visor externo.

## T3.4 — Reevaluar Motion Ripper (decisión, no código)

**Contexto:** criterio 1.4 de `task.md`. Ahora que existe la vía estándar, decidir.

**Pasos:**
1. Probar: captura de vídeo → rig canónico → convertir a `clip.json` estándar → aplicar a
   un molde. Documentar resultado con capturas.
2. Si convence: mantener SOLO ese camino y borrar el retargeting a modelos arbitrarios
   (`motion-ripper-retargeting.js` y dependientes muertos).
3. Si no convence: borrar el subsistema `motion-ripper-*` completo (~40 ficheros) y el
   botón de captura. Es autocontenido; verificar con grep que nada externo lo importa.
4. Actualizar `docs/motion-ripper-freeze.md` con la decisión. Check, build, commit.

**Criterio de éxito:** decisión tomada, documentada y ejecutada; el repo pierde peso
muerto en cualquiera de las dos ramas.

---

## Resumen de dependencias

```
T0.1 → T0.2 → (T0.3, T0.4, T0.5 en cualquier orden)
FASE 1: T1.1 → T1.2 → T1.3 (patrón repetido); T1.4 independiente; T1.5 al final
FASE 2: T2.1 (necesita T1.1+T1.2) → T2.2 → T2.3 (necesita T1.4) → T2.4 → T2.5
FASE 4: T4.1 (necesita T1.4) → T4.2 → T4.3 → T4.4 → T4.5
FASE 3: T3.1 (necesita T2.1, ideal tras T4.5) → T3.2 → T3.3 → T3.4
```

## Reparto: qué hace Fable sí o sí

**Fable obligatorio (fundacionales — un error aquí se propaga a todo lo demás):**

- **T0.4** — Contrato de esqueleto. Es barata de ejecutar pero es LA decisión del
  proyecto: convención de ejes locales, rest pose y nombres. Si la fija mal un modelo
  barato, la Fase 3 entera nace rota y no se nota hasta el final.
- **T1.4** — Sistema faceDecal. Arquitectura transversal (import → persistencia → GLB)
  y decide el look de todas las caras. Fable diseña e implementa el núcleo; añadir
  estilos de ojo/boca extra después sí es delegable.
- **T3.1 + T3.2** — Conformidad de rigs y formato de clip. La tarea más compleja del
  roadmap: matemática de pivots/ejes y el contrato del que depende "animaciones
  portables". Nada de esto es iterable a ciegas por un modelo barato.
- **T2.3** — El héroe benchmark. Requiere juicio visual iterativo (mirar capturas y
  decidir), que es justo lo que un modelo barato no hace bien.

**Fable recomendado (primera pieza, luego delegar el patrón):**

- **T2.1** — Fable migra el PRIMER builder (`makeLimbMesh`) y deja el patrón; los demás
  builders son delegables copiando ese patrón.
- **T4.1–T4.2** — La migración a decals dentro de `avatar-builder.js` y el borrado de
  las tablas de offsets tocan el corazón del montaje; T4.3 (UI) puede delegarse una vez
  T4.1 esté estable.

**Delegables tal cual a un modelo barato:** T0.1, T0.2, T0.3, T0.5, T1.1–T1.3 (patrón
mecánico bien especificado arriba), T1.5, T2.2, T2.4, T2.5, T4.3–T4.5, T3.3, T3.4
(la decisión la toma el humano; la ejecución del borrado es mecánica).
