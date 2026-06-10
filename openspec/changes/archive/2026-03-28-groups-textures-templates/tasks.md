## 1. Template Registry System

- [x] 1.1 Define the declarative template format as a JS object structure: `{ id, name, category, pieces: [{ geometry: { type, params }, color, name, position, rotation?, scale? }] }`
- [x] 1.2 Create `src/modules/template-registry.js` with TEMPLATE_REGISTRY array and migrate existing 5 templates (chair, table, character, crate, barrel) to declarative format
- [x] 1.3 Rewrite `addTemplate(id)` in `templates.js` to read from TEMPLATE_REGISTRY and build Group from pieces array using a generic builder
- [x] 1.4 Add new furniture templates: bookshelf, bed, desk, stool
- [x] 1.5 Add nature templates: tree, rock, bush, mushroom, flower
- [x] 1.6 Add architecture templates: house, door, window, stairs, fence, bridge
- [x] 1.7 Add game prop templates: chest, potion, sword, shield, torch, lamp-post
- [x] 1.8 Add character templates: npc-villager, enemy-placeholder, animal
- [x] 1.9 Generate template buttons dynamically in the left panel from TEMPLATE_REGISTRY, grouped by category with collapsible sections
- [x] 1.10 Remove hardcoded template buttons from index.html, replace with a container div that gets populated dynamically

## 2. Multi-Selection System

- [x] 2.1 Add `selectedMeshes` Set to `state.js` for tracking multi-selection
- [x] 2.2 Modify `selection.js` to handle Ctrl+Click: add/remove from selectedMeshes set, apply highlight to all selected
- [x] 2.3 Implement `deselectAll()` that clears the entire selectedMeshes set and restores all highlights
- [x] 2.4 Modify normal click (without Ctrl) to clear multi-selection before selecting single object
- [x] 2.5 Update selection indicator in top bar to show count when multiple objects selected ("3 OBJETOS")
- [x] 2.6 Modify properties panel to show multi-selection mode: hide individual fields, show group actions (Agrupar, Aplicar color a todos)

## 3. Object Grouping

- [x] 3.1 Implement `groupSelected()` in `actions.js`: create new Group from all objects in selectedMeshes, reparent them preserving world transforms, add Group to userObjects
- [x] 3.2 Implement `ungroupSelected()` in `actions.js`: dissolve Group, reparent children to userObjects preserving world transforms, remove empty Group
- [x] 3.3 Implement double-click handler in `selection.js`: on dblclick, find parent Group of clicked mesh and select the Group (attach TransformControls to Group)
- [x] 3.4 Add Group/Ungroup buttons to properties panel (visible when relevant)
- [x] 3.5 Add keyboard shortcuts: Ctrl+G for group, Ctrl+Shift+G for ungroup in `shortcuts.js`

## 4. Texture UV Controls

- [x] 4.1 Add UV control inputs to properties panel in `index.html`: offset X/Y, repeat X/Y, rotation (degrees)
- [x] 4.2 Add texture thumbnail preview element to properties panel
- [x] 4.3 Implement `updateUVOffset()`, `updateUVRepeat()`, `updateUVRotation()` in `ui.js` — read inputs, apply to selected mesh's texture
- [x] 4.4 Set texture.wrapS and wrapT to THREE.RepeatWrapping when repeat is used
- [x] 4.5 Set texture.center to (0.5, 0.5) for center-based rotation
- [x] 4.6 Update `updatePropertiesPanel()` to populate UV controls with current texture values on selection
- [x] 4.7 Show/hide UV controls section based on whether the selected object has a texture

## 5. Texture Loading UX Improvement

- [x] 5.1 Replace the raw file input with a styled "CARGAR TEXTURA" button/drop-zone in the properties panel texture section
- [x] 5.2 Add drag-and-drop support on the texture upload area: listen for dragover/drop events, load the dropped image file
- [x] 5.3 Show placeholder text "Arrastra imagen o clic para cargar" when no texture is loaded
- [x] 5.4 When texture loads successfully, show a toast "Textura aplicada" and update the thumbnail preview

## 6. Texture GLB Export Fix

- [x] 6.1 Modify `textures.js` — when loading texture, set `colorSpace = THREE.SRGBColorSpace` and `flipY = false`
- [x] 6.2 Modify `export.js` — ensure texture.image is valid before export, set flipY=false on cloned textures
- [x] 6.3 Ensure GLTFExporter embeds texture image data in binary .glb (verify it works with default exporter settings)
- [x] 6.4 Preserve UV transforms (offset, repeat, rotation) in export — GLTFExporter supports KHR_texture_transform if texture.offset/repeat/rotation are set

## 7. JSON Object Import

- [x] 7.1 Create `src/modules/json-import.js` with `importObjectFromJSON(jsonString)` function that validates and builds a Group from JSON definition
- [x] 7.2 Implement JSON validation: check for `pieces` array, valid `geometry.type` on each piece, apply defaults for optional fields (position, rotation, scale, color, name)
- [x] 7.3 Create import modal in `index.html`: overlay with textarea, file upload input, "Importar" and "Cancelar" buttons
- [x] 7.4 Implement modal open/close logic: button in left panel opens modal, Escape or Cancel closes it
- [x] 7.5 Wire "Importar" button: read textarea content, call importObjectFromJSON, close modal on success, show error toast on failure
- [x] 7.6 Wire file upload in modal: read .json file, populate textarea, auto-import
- [x] 7.7 Show error messages in the modal when JSON validation fails (inline, below textarea)

## 8. Save/Load UX Fix

- [x] 8.1 Create a reusable toast notification function in `src/modules/ui.js`: `showToast(message, duration=2000)` — renders a styled div at bottom-center of viewport, auto-removes after duration
- [x] 8.2 Modify `saveToLocalStorage()` — after saving, call `showToast('Escena guardada')`
- [x] 8.3 Modify `loadFromLocalStorage()` — show `confirm('Cargar escena guardada? Se perderan los cambios actuales.')` before loading, show toast "No hay escena guardada" if empty
- [x] 8.4 Style the toast: retro theme (black bg, yellow border, Press Start 2P font), centered at bottom of viewport

## 9. Keyboard Shortcuts Tooltip

- [x] 9.1 Remove the shortcuts text from the top bar in index.html
- [x] 9.2 Add a help icon (keyboard icon or "?" circle) in the viewport overlay area (e.g. top-left)
- [x] 9.3 On hover over the help icon, show a centered overlay panel in the viewport with all shortcuts formatted in a readable grid/table layout
- [x] 9.4 On mouse leave from the help icon/tooltip, hide the overlay
- [x] 9.5 Include all shortcuts: W/E/R, Supr, Ctrl+D, Ctrl+G, Ctrl+Shift+G

## 10. ask.md and README

- [x] 10.1 Create `ask.md` at project root with a complete prompt for external LLMs: includes the JSON schema, supported geometry types with their params, a full example object (e.g. a low-poly tree), and instruction to return ONLY the JSON
- [x] 10.2 Create `README.md` with project description, features, and tech stack
- [x] 10.3 Add setup/run instructions to README (npm install, npm run dev, npm run build)
- [x] 10.4 Add architecture section documenting each module in `src/modules/`
- [x] 10.5 Add usage guide: how to add primitives, select, transform, texture, export
- [x] 10.6 Add "Creating New Templates" section with the declarative format documented and a complete example
- [x] 10.7 Add section referencing ask.md and explaining the LLM import workflow

## 11. UI Updates

- [x] 11.1 Update `index.html` left panel: replace hardcoded template buttons with `<div id="template-list"></div>` container
- [x] 11.2 Add "IMPORTAR OBJETO" button to left panel (opens the import modal)
- [x] 11.3 Add collapsible category sections with click-to-toggle in the dynamically generated template list
- [x] 11.4 Add Group/Ungroup buttons section to properties panel (shown conditionally)
- [x] 11.5 Add UV controls section to properties panel (offset X/Y, repeat X/Y, rotation, thumbnail preview)
- [x] 11.6 Add toast container div to index.html for notifications
- [x] 11.7 Wire new UI elements to their respective functions in `main.js`

## 12. Integration & Wiring

- [x] 12.1 Update `main.js` to import and expose new functions: groupSelected, ungroupSelected, UV update functions, importObjectFromJSON, showToast
- [x] 12.2 Wire double-click event on canvas for group selection
- [x] 12.3 Wire Ctrl+G and Ctrl+Shift+G shortcuts
- [x] 12.4 Call template list generation on DOMContentLoaded
- [x] 12.5 Verify: multi-select 3 objects → group → move group → ungroup → pieces at correct positions
- [x] 12.6 Verify: apply texture → adjust UV controls → export GLB → texture visible in exported file
- [x] 12.7 Verify: all ~20 templates load correctly from registry and appear in categorized UI
- [x] 12.8 Verify: copy prompt from ask.md → paste in external LLM → get JSON → paste in import modal → object appears in scene
- [x] 12.9 Verify: Save → toast appears → Load → confirmation dialog → scene restored
- [x] 12.10 Verify: hover keyboard help icon → shortcuts tooltip centered → mouse away → tooltip hides
