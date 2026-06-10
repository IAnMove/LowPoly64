## 1. Módulo de generación — texture-generator.js

- [x] 1.1 Crear `src/modules/texture-generator.js` con `getTexGenConfig()` / `saveTexGenConfig()` usando localStorage (11 claves).
- [x] 1.2 Implementar `generateTexture(prompt)` como dispatcher que llama a `_generateOpenAI` o `_generateSD` según config.
- [x] 1.3 Implementar `_generateOpenAI(prompt, cfg)`: fetch a `api.openai.com/v1/images/generations`, parsear `data[0].b64_json`.
- [x] 1.4 Implementar `_generateSD(prompt, cfg)`: fetch a `{sdUrl}/sdapi/v1/txt2img`, parsear `images[0]`.
- [x] 1.5 Implementar `fetchOllamaModels(endpoint)`: GET `{endpoint}/api/tags`, retornar array de nombres.
- [x] 1.6 Implementar `enhancePromptWithOllama(prompt)`: POST `{ollamaUrl}/api/generate` con system prompt especializado, retornar `response` limpio.

## 2. Integración en texture-editor.js

- [x] 2.1 Añadir export `applyBase64ToCanvas(base64)` que dibuja una imagen PNG base64 en `paintCanvas`, llama a `saveUndoSnapshot()`, `applyCanvasToMesh()`, `applyCanvasToPreview()`.

## 3. Modal de configuración (CONFIG)

- [x] 3.1 Añadir botón CONFIG morado a la top bar de `index.html`.
- [x] 3.2 Crear modal `#config-modal` con selector METHOD (OpenAI / Local SD), secciones condicionales `#cfg-section-openai` y `#cfg-section-sd`.
- [x] 3.3 Sección OpenAI: campo API key `type="password"` (nunca pre-rellenado, placeholder enmascarado si hay key guardada), modelo, size, quality.
- [x] 3.4 Sección SD: URL del servidor, width, height, steps.
- [x] 3.5 Sección Ollama: endpoint, botón "Load Models", select de modelos descubiertos.
- [x] 3.6 Implementar en `main.js`: `openConfigModal`, `closeConfigModal`, `saveConfigModal`, `onConfigMethodChange`, `loadOllamaModels`, `_refreshOllamaModelSelect`.

## 4. Templates de prompt

- [x] 4.1 Definir 20+ templates en 5 categorías: CHARACTER FACE (6), CHARACTER BODY (4), ENVIRONMENT GROUND (8), ENVIRONMENT WALLS (5), PROPS (3).
- [x] 4.2 Añadir `<select>` con `<optgroup>` en el panel izquierdo del texture editor (versión compacta).
- [x] 4.3 Añadir `<select>` con `<optgroup>` en el prompt expand modal (versión completa con más templates).
- [x] 4.4 Implementar `applyPromptTemplate(selectEl)` en `main.js`: carga el valor seleccionado en `tex-gen-prompt-full`, resetea el select.

## 5. Modal de prompt expandido

- [x] 5.1 Crear modal `#prompt-expand-modal` (z-60, por encima del texture editor) con selector de templates, `<textarea id="tex-gen-prompt-full">` grande, botón ENHANCE (oculto si no hay Ollama), botón GENERATE, botón CLOSE.
- [x] 5.2 La textarea `#tex-gen-prompt` del panel lateral es `readonly`; al hacer click abre el modal. Tiene botón ⤢ superpuesto para expandir.
- [x] 5.3 Implementar `openPromptExpandModal()`: copia `tex-gen-prompt` → `tex-gen-prompt-full`, muestra/oculta ENHANCE según config Ollama, hace focus en textarea.
- [x] 5.4 Implementar `closePromptExpandModal()`: copia `tex-gen-prompt-full` → `tex-gen-prompt`, cierra modal.
- [x] 5.5 Implementar `texGenerateFromModal()`: usa texto del modal, llama a `_runGenerate`, cierra modal.
- [x] 5.6 Extraer `_runGenerate(prompt, btn)` como función compartida para los dos botones GENERATE.

## 6. Integración Ollama — enhance prompt

- [x] 6.1 Implementar `enhancePrompt()` en `main.js`: toma texto de `tex-gen-prompt-full`, llama a `enhancePromptWithOllama`, actualiza textarea con resultado.
- [x] 6.2 El botón ENHANCE solo aparece visible si `cfg.ollamaModel` está configurado (comprobado al abrir el modal).

## 7. Wiring en main.js

- [x] 7.1 Importar `applyBase64ToCanvas` desde `texture-editor.js`.
- [x] 7.2 Importar `generateTexture`, `getTexGenConfig`, `saveTexGenConfig`, `fetchOllamaModels`, `enhancePromptWithOllama` desde `texture-generator.js`.
- [x] 7.3 Exponer todas las funciones nuevas en `window.*`.

## 8. Sprite Sheet / Grid (v0.7.0)

- [x] 8.1 Variables de estado en `texture-editor.js`: `gridEnabled`, `gridCols/Rows`, `selectedTileCol/Row`.
- [x] 8.2 `toggleGrid()` — activa/desactiva grid, actualiza botón GRID con highlight amarillo.
- [x] 8.3 `setGridSize(value)` — parsea "2x2", "3x3", etc. Resetea tile seleccionado.
- [x] 8.4 `_drawGridOverlay()` — dibuja líneas + números + highlight en `tex-grid-canvas` (pointer-events-none, sobre paint canvas).
- [x] 8.5 `_updateSheetNav()` — dibuja miniatura de la textura con grid en `tex-sheet-nav` (canvas clickable en panel izquierdo).
- [x] 8.6 `onNavClick(e)` — click en nav selecciona/deselecciona tile. Toggle si mismo tile.
- [x] 8.7 `getTileBase64(col, row)` — extrae región del canvas como base64 PNG.
- [x] 8.8 `pasteTileBase64(b64, col, row)` — pega imagen en región del tile, llama a `saveUndoSnapshot` + `applyCanvasToMesh`.
- [x] 8.9 `clearSelectedTile()` — rellena el tile seleccionado con blanco.
- [x] 8.10 `_snapUV({u,v})` — snap a límites de grid cuando `gridEnabled`. Usado en `startUVMapDraw` y `doUVMapDraw`.
- [x] 8.11 `_runGenerate` modificado: si hay tile seleccionado, usa `pasteTileBase64`; si no, usa `applyBase64ToCanvas`.
- [x] 8.12 `texEditTile()` en `main.js`: extrae tile, llama a `editTile(b64, prompt)`, pega resultado.
- [x] 8.13 Botón GRID con toggle visual en panel. Select de tamaño de grid (2×2 a 4×4). Nav canvas clickable. Sección tile actions con GENERATE INTO TILE, textarea edit, APPLY EDIT, CLEAR TILE.

## 9. img2img / Tile Editing (v0.7.0)

- [x] 9.1 `editTile(tileBase64, editPrompt)` en `texture-generator.js` — dispatcher.
- [x] 9.2 `_editTileOpenAI(b64, prompt, cfg)` — FormData multipart a `/v1/images/edits`.
- [x] 9.3 `_editTileSD(b64, prompt, cfg)` — JSON POST a `/sdapi/v1/img2img` con `denoising_strength: 0.75`.

## 10. Auto-save (v0.7.0)

- [x] 10.1 `_scheduleAutoSave(mesh)` — debounce 1.5s, llama a `_execAutoSave`.
- [x] 10.2 `_execAutoSave(mesh)` — guarda `{meshName, dataURL, ts}` en `localStorage['lp64_tex_autosave']`.
- [x] 10.3 `_loadAutoSave(mesh)` — carga si existe y tiene < 24h de antigüedad.
- [x] 10.4 `initPaintCanvas` modificado: si el mesh no tiene textura, comprueba auto-save y restaura si existe.
- [x] 10.5 `applyCanvasToMesh` modificado: llama a `_scheduleAutoSave` + `_updateSheetNav` en cada aplicación.
- [x] 10.6 Indicador "AUTO-SAVED" en la UI (fade in/out).
- [x] 10.7 `saveTextureSnapshot()` — guarda en localStorage y descarga PNG como backup manual.
- [x] 10.8 Botón SAVE SNAPSHOT en Actions del texture editor.
- [x] 10.9 `closeTextureEditor` cancela el auto-save timer pendiente.

## 11. Documentación y release

- [x] 11.1 Crear OpenSpec change `ai-texture-generation` con `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`.
- [x] 11.2 Crear specs individuales para cada capability nueva.
- [x] 11.3 Actualizar `CHANGELOG.md` con v0.5.0, v0.6.0, v0.7.0.
- [x] 11.4 Actualizar `help.html` con documentación del sistema de generación de texturas.
