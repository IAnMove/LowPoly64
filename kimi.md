# Mejoras propuestas — Retrovisor / LowPoly64

Listado de mejoras concretas del sistema, con archivos exactos, puntos de
inserción y verificación. Cada mejora es independiente: se puede implementar
y validar por separado. Ordenadas por relación valor/esfuerzo.

Convenciones del repo a respetar siempre:
- i18n bilingüe EN/ES para cualquier texto nuevo (claves en
  `src/modules/shared/i18n.js`).
- Tests: `npm run test:unit` (Node) y suite completa `npm run check`.
- Render de verificación: `npm run render -- --template <id>`.

---

## A1. `retroAO` también al instanciar plantillas

**Qué:** el AO retro por vertex-colors solo se hornea en el import JSON
(`json-import.js`). Las plantillas del panel (clic en TEMPLATES) pasan por
`instantiateTemplateDefinition` y nunca hornean `retroAO`, aunque el JSON de
la plantilla lo declare.

**Archivos:**
- `src/modules/viewport/templates.js` (función `instantiateTemplateDefinition`, línea ~907).
- `src/modules/viewport/vertex-colors.js` (ya exporta `bakeRetroAO` y `normalizeRetroAO`; se usan en `json-import.js` como referencia).

**Pasos:**
1. En `templates.js`, importar `bakeRetroAO` y `normalizeRetroAO` desde `./vertex-colors.js`.
2. Dentro de `instantiateTemplateDefinition`, justo después de
   `const group = buildGroupFromDefinition(def);`, añadir:

   ```js
   const retroAO = normalizeRetroAO(def.retroAO);
   if (retroAO) bakeRetroAO(group, { strength: retroAO.strength });
   ```
3. Marcar una plantilla de prueba con `"retroAO": true` (p. ej.
   `src/data/templates/characters/n64_slime_reference_cm.json`).

**Verificación:** `npm run render -- --template n64_slime_reference_cm` → la
captura muestra degradado vertical (abajo más oscuro). `npm run check` en verde.

---

## A2. `npm run render` acepta recetas de Avatar Forge

**Qué:** hoy el render CLI solo acepta JSON CharacterModel/legacy o
`--template`. Una receta de Avatar Forge (`{ "version": 2, "bodyPresetId",
"headMoldId", "features": {...} }`, el formato que copia el botón COPY
RECIPE) no se puede renderizar.

**Archivos:** `scripts/render-template.mjs` (función `importIntoScene`).

**Pasos:**
1. En `importIntoScene`, dentro del `else` que procesa `payloadText`, antes
   de llamar a `handleImportSubmit()`, detectar la receta:

   ```js
   const parsed = JSON.parse(text);
   const isAvatarRecipe = parsed && parsed.version === 2
     && typeof parsed.bodyPresetId === 'string'
     && typeof parsed.headMoldId === 'string';
   ```
2. Si `isAvatarRecipe`, importar el builder y construir el grupo:

   ```js
   const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');
   group = await buildAvatarGroup(parsed);
   state.userObjects.add(group);
   format = 'avatar-recipe';
   name = parsed.label || 'AVATAR';
   ```
   y saltar el `handleImportSubmit()` actual.
3. Mantener el resto del flujo (bounds, frontSign, budget) igual.

**Verificación:** copiar una receta desde el forge a `tmp/recipe.json` y
ejecutar `npm run render -- tmp/recipe.json` → genera capturas y `report.json`.

---

## A3. Luz de relleno por vista en el render CLI

**Qué:** la luz de relleno añadida en `importIntoScene` es fija (desde el
frente). Las vistas `profile` y `back` siguen capturando el lado en sombra.

**Archivos:** `scripts/render-template.mjs`.

**Pasos:**
1. Eliminar el bloque de fill light de `importIntoScene`.
2. En `frameView(page, view)`, dentro del `page.evaluate`, tras posicionar la
   cámara, clonar la luz clave y orientarla desde la cámara hacia el centro:

   ```js
   const keyLight = state.scene.getObjectByProperty('isDirectionalLight', true);
   if (keyLight) {
     state.scene.children
       .filter((n) => n.userData.__renderFill)
       .forEach((n) => state.scene.remove(n));
     const fill = keyLight.clone();
     fill.userData.__renderFill = true;
     fill.intensity = keyLight.intensity * 0.85;
     fill.position.set(
       state.camera.position.x,
       state.camera.position.y + span * 0.4,
       state.camera.position.z
     );
     state.scene.add(fill);
   }
   ```
3. Así cada vista captura con relleno desde su propia dirección.

**Verificación:** `npm run render -- --template psx_black_mage_cm --views front,profile,back`
→ las tres capturas legibles, sin lado negro.

---

## A4. Flag `--strict` en el render CLI (CI)

**Qué:** el style budget solo avisa en consola. Para CI conviene fallar.

**Archivos:** `scripts/render-template.mjs`.

**Pasos:**
1. En `parseArgs`, aceptar `--strict` (`options.strict = true`).
2. En `main()`, tras construir `report`, si `options.strict &&
   !report.style.withinBudget`, imprimir los warnings y `process.exitCode = 1`.

**Verificación:** `npm run render -- --template psx_black_mage_cm --strict`
→ exit 1 (mage tiene 900 tris). Con `n64_fenix_chick_cm --strict` → exit 0.

---

## A5. Encuadre por FOV vertical en el render CLI

**Qué:** `frameView` usa `distance = span * 1.65` con `span = max(width,
height, depth)`. En modelos muy anchos o muy altos el encuadre queda flojo o
cortado.

**Archivos:** `scripts/render-template.mjs` (`frameView`).

**Pasos:**
1. Leer `state.camera.fov` y `state.camera.aspect`.
2. Calcular:
   ```js
   const fitH = size.height / (2 * Math.tan((state.camera.fov * Math.PI / 180) / 2));
   const fitW = size.width / (2 * Math.tan((state.camera.fov * Math.PI / 180) / 2) * state.camera.aspect);
   const distance = Math.max(fitH, fitW, size.depth * 1.2) * 1.25;
   ```
3. Sustituir el `span * 1.65` por ese `distance`.

**Verificación:** renders de `psx_drake_pup_cm` (ancho) y `psx_black_mage_cm`
(alto) → ambos caben enteros con margen pequeño.

---

## B1. Botón HEAD/FULL de foco de cámara en el forge

**Qué:** el foco de cámara `PREVIEW_FOCUS_HEAD` existe y se activa solo de
forma implícita al tocar selects de cara. No hay botón para el usuario.

**Archivos:**
- `src/modules/avatar/avatar-html.js` (header del preview, junto a los botones FRONT/3-4/SIDE).
- `src/modules/avatar/avatar-ui.js` (ya expone `focusAvatarForgePreview` internamente).

**Pasos:**
1. En el header del preview añadir un grupo de 2 botones:
   `<button data-preview-focus="full">FULL</button>` y
   `<button data-preview-focus="head">HEAD</button>`.
2. En `avatar-ui.js`, dentro de `initAvatarForge`, listener por delegación en
   `#avatar-preview-view-controls` (o un contenedor nuevo):
   `focusAvatarForgePreview(button.dataset.previewFocus)` — la función
   `focusAvatarForgePreview(value)` ya existe y acepta `'full' | 'head'`.
3. Marcar activo con la misma clase que usan los botones de vista
   (`bg-[#00d0ff]`).

**Verificación:** abrir forge, pulsar HEAD → la cámara encuadra la cabeza;
FULL → cuerpo entero.

---

## B2. Fallback de portapapeles en COPY RECIPE

**Qué:** `navigator.clipboard` puede denegar permiso (contextos no seguros,
headless). Hoy solo muestra error.

**Archivos:** `src/modules/avatar/avatar-ui.js` (`copyAvatarRecipeToClipboard`).

**Pasos:**
1. En el `catch`, intentar fallback clásico:

   ```js
   const textarea = document.createElement('textarea');
   textarea.value = payload;
   textarea.style.position = 'fixed';
   textarea.style.opacity = '0';
   document.body.appendChild(textarea);
   textarea.select();
   const ok = document.execCommand('copy');
   textarea.remove();
   showToast(t(ok ? 'avatarRecipeCopied' : 'avatarRecipeCopyFailed'));
   ```

**Verificación:** en navegador normal → toast de copiado; forzando el fallo
(devtools, denegar permiso) → el fallback copia igualmente.

---

## B3. Turntable no debe pelear con la vista fijada

**Qué:** con TURNTABLE activo, los botones FRONT/3-4/SIDE fijan la vista pero
el auto-rotate la mueve al instante; y al activar turntable la vista queda
"fijada" en un botón que ya no refleja la realidad.

**Archivos:** `src/modules/avatar/avatar-ui.js` (`setTurntableEnabled` y
`setAvatarForgePreviewView`).

**Pasos:**
1. En `setTurntableEnabled(true)`: poner
   `avatarForgeState.previewViewPinned = false` y llamar a
   `syncPreviewViewControls()` (desmarca los botones).
2. En `setAvatarForgePreviewView`: si `avatarForgeState.turntableEnabled`,
   llamar primero a `setTurntableEnabled(false)` (así la vista fijada gana y
   el toggle refleja el estado real).

**Verificación:** activar turntable (gira), pulsar FRONT (para de girar y se
ve de frente), reactivar turntable (gira de nuevo y ningún botón queda
marcado).

---

## B4. Animación idle/walk en el preview del forge

**Qué:** la receta declara `animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE'`
pero el preview es estático. Reproducir `idle` daría vida al preview.

**Archivos:**
- `src/modules/avatar/avatar-preview-runtime.js` (crear `THREE.AnimationMixer`).
- `src/modules/avatar/avatar-ui.js` (loop `animate` ya existe: actualizar el mixer con `previewClock.getDelta()`).
- Reutilizar `src/data/skeletons/humanoid_standard.json` y el sistema de rig de `src/modules/animation/rigging-utils.js` (`rebuildRigAnimationsForGroup` ya genera clips para grupos con `skeletonId`).

**Pasos:**
1. Tras `buildAvatarGroup(recipe)` en `rebuildPreview`, llamar a
   `rebuildRigAnimationsForGroup(previewGroup, { skeletonId: 'HUMANOID_STANDARD', animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE' })` para obtener los clips.
2. Crear `mixer = new THREE.AnimationMixer(previewGroup)` y
   `mixer.clipAction(clips.find(c => c.name === 'idle')).play()`.
3. En `animate()`: `avatarForgeState.previewMixer?.update(delta)`.
4. Guardar `previewMixer` en el estado y destruirlo en `clearPreviewGroup`.
5. Añadir toggle `ANIM` en el header del preview (clave i18n nueva
   `avatarPreviewAnim`) para activar/pausar (`action.paused = !on`).

**Riesgo:** el rig sintético puede mover pivots; si se ven artefactos, hacer
la animación opt-in solo con el toggle (apagado por defecto).

**Verificación:** abrir forge → el avatar hace idle (sube/baja sutilmente la
cadera). `npm run check` en verde.

---

## B5. Cicladores ‹ › para pelo, nariz y orejas

**Qué:** ojos/cejas/boca/fullface ya tienen cicladores; pelo/nariz/orejas solo
select. Mismo patrón UX.

**Archivos:**
- `src/modules/avatar/avatar-html.js` (sección HAIR AND EXTRAS).
- `src/modules/avatar/avatar-form-view.js`.

**Pasos:**
1. En `avatar-form-view.js` extender `FACE_CYCLE_SELECT_IDS` con:
   `hair: 'avatar-hair-select'`, `nose: 'avatar-nose-select'`,
   `ears: 'avatar-ear-select'` (ojo: también alimenta la galería; mejor crear
   un mapa separado `EXTRA_CYCLE_SELECT_IDS` para no abrir la galería de sprites en estos).
2. En `avatar-html.js`, bajo cada select, añadir la fila de botones ‹ índice ›
   igual que la de `data-face-cycle` pero con `data-extra-cycle="hair"` etc.
3. En `bindAvatarFormListeners`, replicar el handler de `data-face-cycle`
   para `data-extra-cycle` (mismo algoritmo de avance circular + dispatch
   `change`).

**Verificación:** pulsar › en HAIR cambia el preset y el preview se reconstruye.

---

## B6. Borrador de receta en localStorage

**Qué:** al cerrar el forge se pierde la receta en curso. Guardar borrador.

**Archivos:** `src/modules/avatar/avatar-ui.js`.

**Pasos:**
1. Clave `lowpoly64.avatarForgeDraft`.
2. En `updateRecipe`, guardar debounced (300 ms)
   `JSON.stringify(avatarForgeState.recipe)`.
3. En `openAvatarForge`, si NO hay `targetGroup` y existe borrador, ofrecer
   restaurarlo: cargarlo directamente y `showToast(t('avatarDraftRestored'))`
   (nueva clave i18n). Al confirmar (CREATE/UPDATE) o cancelar con el botón
   CANCEL, borrar la clave.

**Verificación:** editar, cerrar sin crear, reabrir → la receta vuelve;
crear el avatar → el borrador se limpia.

---

## B7. Test E2E de las funciones nuevas del forge

**Qué:** chips de héroe, dados, turntable y copy no tienen cobertura.

**Archivos:** nuevo `tests/e2e/avatar-forge-revamp.spec.js`; referencia de
helpers en `tests/e2e/helpers/avatar-forge.js`.

**Pasos:**
1. Spec Playwright que abra la app y el forge.
2. Asserts: `document.querySelectorAll('[data-hero-preset]').length === 6`;
   4 botones `[data-dice-section]`; existe `#avatar-turntable-toggle` y
   `#avatar-copy-recipe-btn`.
3. Click en `[data-hero-preset="mage_shadow"]` → `#avatar-label-input` vale
   "Shadow Mage" y el select de cuerpo vale `psx_slim`.
4. Click en dado FACE → cambia el valor de `#avatar-eye-select` (muestrear
   antes/después con varios intentos por si el azar repite).
5. Toggle turntable → assert estado interno vía
   `getAvatarForgePreviewDiagnostics()` o eval del checkbox.

**Verificación:** `npx playwright test tests/e2e/avatar-forge-revamp.spec.js` en verde.

---

## C1. Miniaturas (thumbnails) de plantillas

**Qué:** el panel TEMPLATES lista ~300 plantillas como texto. Generar PNGs
con el propio render CLI y mostrarlos.

**Pasos:**
1. Script `scripts/render-thumbnails.mjs`: para cada `TEMPLATE_REGISTRY`,
   llamar al mismo flujo headless del render CLI con `--views front --size
   192x144 --out public/thumbnails/<id>` y copiar el PNG a
   `public/thumbnails/<id>.png`.
2. Añadir script npm `"thumbnails": "node ./scripts/render-thumbnails.mjs"`.
3. En el item del panel de plantillas (donde se pinta cada nombre; buscar el
   render de la lista en `src/modules/viewport/ui.js`), añadir
   `<img loading="lazy" src="/thumbnails/<id>.png" alt="">` con fallback si
   404 (ocultar img).
4. `.gitignore` para `public/thumbnails/` si no se quieren commitear.

**Verificación:** `npm run thumbnails` (subset pequeño primero) y abrir el
panel → se ven imágenes.

---

## C2. Toast de presupuesto de estilo al instanciar plantilla

**Qué:** el aviso de style budget solo aparece en import JSON. Al añadir una
plantilla desde el panel no hay feedback.

**Archivos:** `src/modules/viewport/templates.js` (`addTemplate`, línea ~973).

**Pasos:**
1. Tras `const group = instantiateTemplateDefinition(def);`, evaluar:

   ```js
   const { evaluateStyleBudget } = await import('./style-budget.js');
   const { warnStyleBudgetOverage } = await import('./style-budget.js'); // si existe el helper; si no, replicar el toast de json-import.js
   const result = evaluateStyleBudget(group);
   if (!result.withinBudget) warnStyleBudgetOverage(result);
   ```
   (En `json-import.js` está el patrón exacto de toast a reutilizar; si
   `warnStyleBudgetOverage` vive allí, exportarlo desde `style-budget.js` y
   usarlo en ambos sitios.)

**Verificación:** instanciar `n64_skull_knight_cm` (872 tris) desde el panel
→ toast de aviso; instanciar `n64_fenix_chick_cm` (420) → sin toast.

---

## C3. Normalizar finales de línea (EOL)

**Qué:** varios archivos mezclan CRLF y LF (p. ej.
`src/modules/avatar/avatar-html.js`), lo que rompe herramientas de edición
por coincidencia exacta.

**Pasos:**
1. Crear `.gitattributes` en la raíz:
   ```
   * text=auto eol=lf
   ```
2. Script de una pasada (Node): recorrer `src/**/*.js`, `scripts/**/*.mjs`,
   `tests/**/*.js`, `*.md` y reescribir convirtiendo `\r\n` → `\n`.
3. Commit aparte, sin otros cambios.

**Verificación:** `git diff --stat` muestra solo cambios de EOL;
`npm run check` en verde.

---

## C4. Documentar los controles nuevos del forge en la ayuda

**Qué:** `src/modules/shared/i18n.js` tiene textos de ayuda del forge pero no
menciona Starter Heroes, dados, turntable ni copy recipe.

**Pasos:**
1. Buscar en `src/help.js` las entradas `avatarForge*` (EN ~línea 346, ES
   ~línea 599).
2. Añadir una línea por control en ambos idiomas, p. ej. EN: "Starter Heroes
   load a full curated recipe in one click; dice buttons randomize a single
   section; TURNTABLE spins the preview; COPY RECIPE puts the recipe JSON on
   the clipboard."

**Verificación:** abrir HELP dentro de la app y leer la sección del forge.

---

## D. Mejoras de contenido (opcionales, rápidas)

1. **Más héroes iniciales:** añadir 2–3 presets a
   `src/data/avatar/catalog/forge-hero-presets.js` (p. ej. un "Ancient Sage"
   con `brow_elder` + `mouth_beard_gap` + palette `cool_ash`). Sin más código.
2. **Variantes de los 6 modelos:** clonar una plantilla de
   `src/data/templates/characters/` cambiando paleta (`material` y
   `faceColors`/`vertexColors`) para crear, p. ej., "Mago Carmesí" desde
   `psx_black_mage_cm`.
3. **Ala del draco más rica:** en `scripts/forge-new-characters.mjs`, el ala
   del `psx_drake_pup_cm` son 2 triángulos; subdividir en 4 añadiendo un
   vértice medio y 2 caras más mejora la silueta por ~8 tris.

---

## Orden sugerido de ejecución

1. C3 (EOL) — facilita todo lo demás.
2. A1, A3, A4, A5 — tooling de render (pequeños, independientes).
3. B1, B2, B3 — retoques del forge (pequeños).
4. B7 — tests de lo nuevo.
5. C2, C4 — feedback y docs.
6. A2 — recetas en render CLI.
7. B5, B6 — UX del forge.
8. C1 — thumbnails (más largo).
9. B4 — animación en preview (la más arriesgada, dejar al final).
