# LowPoly64 architecture review

## Current read

LowPoly64 already has a strong product direction: a browser editor for retro low-poly game assets, with JSON import/export, LLM-friendly prompts, templates, textures, animation, bones, local persistence, and GLB export. That combination is more specific and more defensible than a generic "mini Blender".

The codebase is already partially modular: primitives, templates, selection, actions, animation, persistence, textures, and UI live in separate files. The main problem was not lack of files; it was that composition, DOM wiring, global `window` handlers, and feature logic were mixed together.

## What works

- Declarative templates in `src/data/templates` are a good asset pipeline base.
- JSON import validation has useful limits for pieces, geometry params, hierarchy depth, and numeric ranges, and now lives in a pure validation module with translation injected at the browser edge.
- JSON import UI now has a root-injectable DOM adapter, while file parsing reuses the shared browser JSON adapter.
- Object/animation JSON import parsing, routing, object construction orchestration, undo registration, selected-group animation import, and file-submit flow now live in `json-import-flow.js`; browser dependency assembly for global import state, root-injected modal DOM, selection, undo, templates, animation import, toasts, translations, and file JSON reading now lives in `json-import-browser-adapter.js`, while `json-import.js` is a small public command facade.
- JSON import state access now normalizes `selectedMesh` and selected-group reads from a single `getImportState()` source with legacy getter fallbacks; `json-import-browser-adapter.js` passes only the browser singleton state getter for selection reads, and the Vite-only template builder is injected from `json-import.js` so the adapter stays Node-importable.
- Animation import/export is a clear differentiator for game assets.
- GLB export source selection now lives in `export-targets.js`, separate from GLTFExporter loading and browser download side effects.
- GLB export graph preparation now lives in `export-prepare.js`, separate from browser download and lazy `GLTFExporter` loading.
- GLB export orchestration for empty-scene checks, source preparation, lazy exporter parsing, Blob download, and error alerts now lives in `glb-export-flow.js`; browser dependency assembly for Three classes, global export state, Blob/download, lazy `GLTFExporter`, logging, alerts, and translations now lives in `export-browser-adapter.js`, while `export.js` is a small public command facade.
- Browser download link creation for JSON blobs, GLB blobs, and texture PNG data URLs now lives in `browser-download-adapter.js`.
- Object/scene JSON export payload selection, filename creation, download/copy dispatch, and clipboard fallback now live in `json-export-flow.js`; browser dependency assembly for global export state, serializers, JSON download, toast, translations, clipboard, and prompt fallback now lives in `json-export-browser-adapter.js`, while `json-export-actions.js` is a small public command facade.
- Persistence includes scene validation and error handling.
- Persistence runtime orchestration for scene serialization/deserialization, object cleanup/disposal, local-storage save/load, JSON export, and JSON import now lives in `persistence-runtime-flow.js`.
- Persistence facade orchestration for runtime state access, selection reset, translated messages, injected storage/JSON adapters, and import/export controller methods now lives in `persistence-controller.js`.
- Persistence browser dependency assembly for global state, selection, toasts, translations, injected scene storage, browser JSON adapters, and confirm dialogs now lives in `persistence-browser-adapter.js`; `persistence.js` is a small public command facade.
- Vite + Three.js is a pragmatic stack for this type of editor.
- The UI is compact and tool-first, which fits an editor better than a marketing layout.
- HTML action wiring is now declarative through `data-action`, `data-change-action`, and `data-input-action`, with dispatch mechanics isolated in `app-action-bindings.js` and command-map creation isolated in `app-action-map.js`.
- App action-map state access now normalizes `selectedMesh` from a single `getAppActionState()` source with a legacy `getSelectedMesh` fallback; `app.js` passes only the browser singleton state getter for action-map state reads.
- App chrome refresh wrappers for scene/object list updates, selection chrome updates, scene import/load refreshes, and action-after-refresh commands now live in `app-chrome-actions.js`.
- App cross-module hook configuration for action context, selection hooks, shortcut adapters, import hooks, and UI hooks now lives in `app-cross-module-hooks.js`.
- App DOM setup for canvas selection events, template list language refresh, texture drop-zone binding, palette color input binding, and multi-color value reads now lives in root-bound `app-dom-setup.js`.
- App lazy-module caching, declarative action binding dispatch, initialization ordering, browser event registration, palette setup, and DOMContentLoaded bootstrap decisions now live in `app-bootstrap-flow.js`; `app.js` remains the browser composition root.
- Side-panel collapse behavior and narrow-viewport policy now live in `panel-controller.js`, while `panel-browser-adapter.js` owns document/window access and scene resize scheduling; `panels.js` is a public facade.
- Undo stack management now lives in `undo-history.js`; `undo.js` is a small facade with toast feedback injected from app bootstrap instead of importing UI directly.
- Keyboard shortcut decisions now live in `shortcut-controller.js` with injected command/state hooks and no browser `document` fallback; `shortcuts.js` is a small public facade.
- Action context now normalizes both legacy `state` and explicit `getActionState` inputs, and action facades read runtime state through `getActionState()`.
- Object duplicate/delete action behavior, texture metadata cloning, selection side effects, and undo/redo action creation now live in `object-action-flow.js`; `object-actions.js` is the action-context facade.
- Scene center-camera and reset-scene action behavior now lives in `scene-action-flow.js`, with shared mesh/material disposal in `scene-disposal.js`; `scene-actions.js` is the action-context facade.
- Group/ungroup action behavior, world-transform preservation, selected-group resolution, and undo/redo action creation now live in `group-action-flow.js`; `group-actions.js` is the action-context facade.
- Bone attach/detach action behavior, root-group discovery, pivot reparenting, descendant/depth guards, toasts, and undo/redo action creation now live in `bone-action-flow.js`; `bone-actions.js` is the action-context facade.
- Primitive geometry construction, mesh naming/placement, add-to-scene orchestration, selection side effects, and undo/redo registration now live in `primitive-runtime-flow.js`; `primitive-controller.js` reads runtime state through an injected getter, `primitive-browser-adapter.js` chooses Three classes, material creation, selection, undo, and translations, and `primitives.js` is a small public command facade.
- Selection highlight/restore behavior now lives in a small Three-focused module instead of being embedded in mouse selection flow.
- Selection raycast target resolution and root-injectable selection header DOM updates now live in dedicated modules with focused tests.
- Single-selection, multi-selection, transform-control attach/detach, and highlight/unhighlight state transitions now live in `selection-state.js`.
- Selection UI feedback for single selection, deselection, multi-selection headers, export-button updates, and timeline hiding now lives in `selection-ui-flow.js`.
- Mouse/double-click selection decisions, including multi-select toggles, animation-mode guards, and bone-click routing, now live in `selection-event-decision.js`.
- Selection decision execution now lives in `selection-decision-executor.js` with injected handlers for multi-select, attach-bone, select, and deselect.
- Selection pointer-event flow, raycast target picking, bone picking gates, and mouse/double-click decision execution now live in `selection-pointer-flow.js`.
- Selection runtime composition for mouse/double-click handlers, single/multi selection orchestration, transform-control adapters, hook callbacks, and UI feedback now lives in `selection-runtime-flow.js`.
- Selection facade orchestration for raycaster creation, runtime composition, injected UI services, transform-control state access, and app-level hooks now lives in `selection-controller.js`.
- Selection browser dependency assembly for the global selection state getter, scene bone raycasting, translations, root-injected selection DOM, selection highlighting, and UI services now lives in `selection-browser-adapter.js`; `selection.js` is a small public command facade.
- i18n lookup, language storage, root-bound DOM translation application, language state, language-change callbacks, and browser dependency assembly are now separated behind the existing public i18n facade.
- Snap transform settings, root-bound snap indicator DOM updates, and snap toggle orchestration with explicit runtime state access are now split from the stateful `toggleSnap` facade.
- Material creation and root-injectable color input syncing are now separated from the stateful materials facade.
- Material replacement, flat-shading/wireframe application, mesh color mutation, and palette color selection now live in `material-commands.js`.
- Quick color application, input sync, and undo action registration now route through `material-quick-color-flow.js`.
- Material settings runtime flows for material creation, selected-material replacement, flat/wire toggles, and selected quick color now live in `material-runtime-flow.js`.
- Material facade runtime orchestration for material creation, material replacement, flat/wire toggles, palette color selection, color mutation, quick color, and explicit runtime state access now lives in `material-controller.js`.
- Material controller state access now normalizes `selectedMesh` and `retroPalette` from a single `getMaterialState()` source with legacy getter fallbacks.
- Material browser dependency assembly for global material state, translations, undo, and root-bound color-input syncing now lives in `material-browser-adapter.js`; `materials.js` is a small public command facade.
- Texture runtime flows for file-load application, selected-object texture toggles, panel preview updates, success/error toasts, and pixelated filter toggles now live in `texture-runtime-flow.js`.
- Texture panel preview, UV-control visibility, and drag/drop binding now live in `texture-panel-dom.js` with an injectable root adapter composed by `texture-browser-adapter.js`.
- Texture facade runtime orchestration for upload input, drag/drop binding, apply texture action labels, selected texture toggles, pixelated mode toggles, and explicit runtime state access now lives in `texture-controller.js`.
- Texture controller state access now normalizes `selectedObject` from a single `getTextureState()` source with legacy `getSelectedObject` fallback.
- Texture browser dependency assembly for global texture state, Three.js texture/filter classes, undo, toasts, translations, browser image loading, and texture panel DOM services now lives in `texture-browser-adapter.js`; `textures.js` is a small public command facade.
- Texture editor paint constants, palette, pointer coordinate scaling, brush radius lookup, and stroke interpolation now live in `texture-editor-paint-core.js`.
- Texture editor paint brush color, brush size, and eraser-mode state transitions now live in `texture-editor-paint-tool-state.js`.
- Texture editor paint palette container clearing, swatch creation, click binding, and color-selection dispatch now live in `texture-editor-paint-palette-ui.js`.
- Texture editor paint undo, new blank canvas, and image-load surface command orchestration now live in `texture-editor-paint-command-flow.js`.
- Texture editor brush draw commands for normal paint, eraser paint, and interpolated strokes now live in `texture-editor-paint-commands.js`.
- Texture editor paint stroke start/move/end state, alternate UV-map delegation, preview updates, snapshot, and commit/after-commit dispatch now live in `texture-editor-paint-flow.js`.
- Texture editor paint undo snapshot history now lives in `texture-editor-paint-history.js`.
- Texture editor paint surface operations for clear, fill, image replacement, source-canvas cloning, and fallback fill now live in `texture-editor-paint-surface.js`.
- Texture editor paint canvas initialization, source-image restoration, first undo snapshot, flow reset, previous-listener cleanup, and event binding now live in `texture-editor-paint-init-flow.js`.
- Texture editor paint canvas event binding and cleanup now live in `texture-editor-paint-events.js`.
- Texture editor paint image-file input loading and canvas download flow now live in `texture-editor-paint-file-flow.js`.
- Texture editor face UV geometry application, cube face-UV propagation, and global texture transform flow now live in `texture-editor-face-uv-flow.js`.
- Texture editor face UV input reading, global UV form writing, and selected-face control rendering now live in `texture-editor-face-ui.js`.
- Texture editor face initialization for cube/non-cube targets, face-section visibility, preview click binding, global UV reset, and initial face UV propagation now lives in `texture-editor-face-init-flow.js`.
- Texture editor face selection/deselection state transition, preview auto-rotate toggles, highlight callbacks, and redraw decisions now live in `texture-editor-face-selection-flow.js`.
- Texture editor selected-face mutable state, UV-map mode, drag state, preview click target, and face-highlight reference now live in `texture-editor-face-state.js`.
- Texture editor UV-map draw start/update/end orchestration now lives in `texture-editor-face-uvmap-flow.js`.
- Texture editor face UV overlay positioning, UV-map canvas drawing, and drag-rectangle math now live in `texture-editor-face-overlay.js`.
- Texture editor preview face picking and face-highlight geometry lifecycle now live in `texture-editor-face-preview.js`.
- Texture editor preview runtime state, lifecycle initialization/disposal, hover auto-rotate gates, render-loop composition, and renderer cleanup now live in `texture-editor-preview-runtime-flow.js`.
- Texture editor preview scene construction, renderer creation, and hover auto-rotate binding now live in `texture-editor-preview-scene.js`.
- Texture editor preview live canvas-texture replacement and texture transform updates now live in `texture-editor-preview-texture.js`, with live canvas texture construction delegated to `texture-core.js` and browser canvas creation injected from `browser-canvas-adapter.js`.
- Texture image-to-data-URL conversion for persistence uses `texture-core.js` through `browser-canvas-adapter.js`; `persistence-textures.js` focuses on texture DTO serialization/restoration.
- Texture editor brush/eraser/UV-map tool selection policy, cursor updates, UI refresh, and all-face overlay redraw dispatch now live in `texture-editor-tool-flow.js`.
- Texture editor canvas commit and preview refresh target resolution now live in `texture-editor-canvas-flow.js`.
- Texture editor open/close lifecycle, mesh resolution guard, modal visibility, paint/preview/face initialization, tool UI refresh, and cleanup/disposal ordering now live in `texture-editor-lifecycle-flow.js`; selected editable mesh resolution and modal commands now route through `texture-editor-session-controller.js` plus `texture-editor-session-browser-adapter.js`.
- Animation timeline DOM rendering and playback UI updates are now root-injectable and separated from the stateful animation panel facade.
- Animation import form text/error DOM access is now root-injectable and separated from the animation panel facade.
- Animation mode panel/banner DOM toggling is now root-injectable and separated from the animation panel facade.
- Animation mode list row rendering is now root-injectable and separated from the animation panel facade through callbacks.
- Animation mode state, object visibility toggling, active animation target lookup, clip availability checks, and clip deletion now live in `animation-mode-state.js`.
- Animation mode enter/exit/delete orchestration now lives in `animation-mode-flow.js` with injected selection, camera, toast, timeline, and list-refresh side effects.
- Animation timeline frame scheduling now lives in `animation-timeline-loop.js`.
- Animation import validation, target checks, importer result handling, warning feedback formatting, and submit success/error UI orchestration now live in `animation-import-flow.js`.
- Animation JSON normalization, validation, single/multiple animation import, compiler dispatch, warning aggregation, and imported-count toast orchestration now live in `animation-import-core.js` with injected translation, compiler, and toast dependencies; `animation-import-browser-adapter.js` chooses production translation/toast/compiler dependencies and `animation-import.js` is a small public import facade.
- Animation panel group/index/import target resolution now lives in `animation-panel-targets.js`.
- Animation panel runtime orchestration for playback, import submit, timeline-loop startup, animation-mode enter/exit/list/play/delete/import now lives in `animation-panel-runtime-flow.js`.
- Animation panel facade composition for target creation, runtime controller wiring, playback/import/timeline/mode dependencies, explicit runtime state access, and public command delegation now lives in `animation-panel-controller.js`.
- Animation panel browser dependency assembly now lives in `animation-panel-browser-adapter.js`, which now composes root-bound timeline/list/import/mode DOM adapters and injects selected-index reads into panel targets; `animation-panel.js` is a small public command facade.
- Animation panel timeline rendering, animation-mode list refresh, and animation-mode clip playback orchestration now live in `animation-panel-flow.js`.
- Animation playback decisions for play, restart-on-select-change, play/stop toggle, and play-by-index now live in `animation-playback-flow.js`.
- Properties panel fields, action-button visibility, and UV controls are now root-injectable and separated from the stateful UI facade.
- Property target resolution, material type/color lookup, transform/name updates, action visibility calculation, and texture UV commands now live in `property-commands.js`.
- Color/material property undo-redo action creation now lives in `property-history-actions.js`.
- Selected-object property update flows for transform, name, color/material history registration, and UV texture updates now live in `selected-property-flow.js`.
- Selected-object properties panel presentation now lives in `properties-panel-presenter.js` with injected DOM adapters.
- UI facade runtime orchestration for the properties panel, selected-property commands, clear/multi-selection panel chrome, toasts, multi-color application, color input syncing, export-button labels, and explicit runtime state access now lives in `ui-controller.js`.
- UI controller state access now normalizes a single `getUIState()` source with legacy `getSelectedObject`/`getSelectedMeshes`/`getUserObjects`/`getBonesVisible` fallbacks.
- UI browser dependency assembly for global UI state, UI hooks, material services, root-bound property/toast/export/material DOM adapters, undo, translations, and texture transform persistence now lives in `ui-browser-adapter.js`; `ui.js` is a small public command facade.
- Object-list recursive row rendering, expand/collapse toggle rendering, root-group double-click targeting, and selected overlay rendering now live in root-injectable `object-list-dom.js`.
- Object-list open/refresh/select/overlay orchestration now lives in `object-list-controller.js`, with browser dependency assembly and root-bound DOM renderer creation in `object-list-browser-adapter.js`; `object-list.js` is a small public command facade.
- Toast rendering and export-button label updates are now root-injectable and separated from the stateful UI facade.
- Export-button selected-state calculation now lives in `export-button-state.js`.
- Animation clip compilation is now separated from the stateful animation playback runtime.
- Animation playback runtime state transitions, mixer/action setup, progress calculation, and mixer updates now live in `animation-runtime.js`.
- Animation facade runtime orchestration for play/pause/resume/stop/toggle/progress/mixer-update and explicit runtime state access now lives in `animation-controller.js`.
- Template list DOM rendering is now root-injectable and separated from template group construction and registry access.
- Template geometry creation is now separated from template group/runtime insertion behavior.
- Template group hierarchy construction, pivot re-parenting, material injection, and animation compilation now live in `template-group-builder.js`.
- Template group insertion, initial selection, and undo/redo action creation now live in `template-actions.js`.
- Template registry lookup, category grouping, runtime material-type selection, missing-template handling, and insertion orchestration now live in `template-runtime-flow.js`.
- Template facade runtime orchestration for build, add, category lookup, list rendering, and explicit runtime getters now lives in `template-controller.js`.
- Template controller state access now normalizes a single `getTemplateState()` source with legacy `getMaterialType`/`getSelectedMesh`/`getUserObjects` fallbacks.
- Template browser dependency assembly for template state, material creation, selection, translations, root-bound list DOM rendering, undo, animation compilation, missing-template reporting, and registry injection now lives in `template-browser-adapter.js`; `templates.js` is a small public command facade that passes the Vite-only template registry.
- Bone visualization target discovery, helper rendering, bone picking, and per-frame updates are now separated from scene setup/render-loop ownership, with mutable helper overlay state encapsulated in `bone-visualization-controller.js` and browser Three/state assembly in `bone-visualization-browser-adapter.js`.
- Scene/camera/renderer/world-object setup, OrbitControls configuration, user-object group creation, and viewport resizing now live in `scene-setup.js`.
- TransformControls creation, drag handlers, transform snapshots, pivot-mesh compensation, and undo/redo action construction now live in `scene-transform-controls.js`.
- Scene canvas/viewport lookup, resize listener binding, and device pixel ratio lookup now live in root/window-bound `scene-dom.js`.
- Scene object-list row rendering, empty-state rendering, and selection callback binding now live in root-injectable `scene-object-list-dom.js`.
- Scene object-list refresh/select orchestration now lives in `scene-object-list-controller.js`, with browser dependency assembly and root-bound DOM renderer creation in `scene-object-list-browser-adapter.js`; `scene-object-list.js` is a small public command facade.
- Scene frame scheduling, animation-mixer updates, bone updates, OrbitControls updates, and renderer calls now run through `scene-render-loop.js`.
- Scene runtime initialization, state service assignment, resize lifecycle, render-loop startup, and previous-runtime cleanup now live in `scene-runtime-flow.js`.
- Scene facade composition for runtime controller wiring, scene setup adapters, DOM adapters, render-loop adapters, animation/bone updates, undo, property refresh, and explicit runtime state access now lives in `scene-controller.js`.
- Scene browser dependency assembly now lives in `scene-browser-adapter.js`, which composes root/window-bound scene DOM adapters; `scene.js` is a small public command facade with compatibility bone re-exports.
- Editor state shape and fresh mutable collection creation now live in `state-factory.js`; `state.js` is only the browser singleton instance.

## What does not scale yet

- `state.js` is still a global mutable singleton used by many browser-facing modules, but the default state shape and fresh mutable collection creation now live in `state-factory.js`.
- DOM reads/writes are still present in browser-facing modules, but import/export target selection, GLB exporter orchestration, object/animation JSON import flow, JSON import modal DOM, object/scene JSON export flow, texture panel, texture editor, animation panel DOM, properties panel, side panels, selection header rendering, template-list rendering, object-list rendering, scene object-list rendering, toast/export chrome, and app action wiring now have clearer adapter boundaries.
- Browser storage is now isolated for scene persistence and language preference; scene persistence storage is injectable through `createSceneStorage`, and runtime browser state is still held in the global `state.js` singleton instance while fresh test/runtime states can be created through `createEditorState`.
- `texture-editor.js` is now mostly a facade for texture-editor submodules; root-bound texture editor DOM ids/element creation, paint math, brush draw commands, paint file flow, preview scene/renderer creation, preview texture updates, and preview frame scheduling are separated, while shared texture construction lives in `texture-core.js`, browser canvas creation lives in `browser-canvas-adapter.js`, and browser download dispatch lives in `browser-download-adapter.js`.
- Texture editor face UV field updates, global/cube UV-submit branching, preview UV application, and overlay/UI refresh decisions now live in `texture-editor-face-update-flow.js`.
- Texture editor face render DTOs, translated face-name mapping, selected-face controls, selected overlay, and all-face UV-map overlay dispatch now live in `texture-editor-face-render-flow.js`.
- Texture editor face preview click selection, listener cleanup, and highlight replacement/disposal orchestration now live in `texture-editor-face-preview-flow.js`.
- Texture editor face translation/toast services are injected into `texture-editor-face.js` from the lazy `texture-editor.js` composition root.
- `persistence.js` is now the public persistence command facade with the import-compatible group serializer re-export, while `persistence-browser-adapter.js` chooses the global persistence getter source, selection, toasts, translations, storage, browser JSON services, and confirm dialogs; runtime serialization/deserialization, cleanup/disposal, storage/import/export flow, facade orchestration, and state reads have been moved out.
- Action modules now receive runtime dependencies through an action context, and action facades read state through `getActionState()`; object duplicate/delete, scene center/reset, group/ungroup, and bone attach/detach behavior are isolated behind action flow modules, while the default app context still points at global browser state, selection, undo, and UI services.
- Shortcut behavior now lives in a browser-independent controller; `configureShortcutHooks` only configures the public facade, while active-element, animation-mode, import-modal, and command adapters are composed in `app-cross-module-hooks.js`.
- `selection.js` is now the public selection command facade, while `selection-browser-adapter.js` chooses the global selection state getter, scene bone raycasting, UI services, translations, selection DOM, and selection highlighting; raycaster creation, runtime facade composition, transform-control state-shape access, app-level hook storage, pointer-event flow, bone picking gates, event decision logic, decision execution, selection state transitions, and selection UI feedback have been moved out.
- `scene.js` is now the public scene command facade with compatibility bone re-exports, while `scene-browser-adapter.js` chooses the global scene getter source, browser scene setup, DOM adapters, animation/bone update services, undo, and properties refresh; facade composition, runtime initialization, state service assignment, previous-runtime cleanup, browser DOM lookup, resize binding, scene setup, render-loop scheduling, bone helper rendering, and TransformControls behavior have been moved out.
- `animation-panel.js` is now the public animation-panel command facade, while `animation-panel-browser-adapter.js` chooses the global animation getter source, playback services, selection/camera services, animation-mode chrome, import DOM adapters, toast, and translations; facade composition, runtime orchestration, selected target resolution, playback decisions, timeline-loop scheduling, animation import validation/result orchestration, animation list/timeline refresh orchestration, animation mode state/visibility, enter/exit/delete orchestration, and clip deletion rules have been moved out.
- `textures.js` is now the public texture command facade with texture-core utility re-exports, while `texture-browser-adapter.js` chooses the global texture state getter, Three.js texture/filter classes, toasts, translations, undo, browser image loading, and texture panel DOM services; upload/drop/apply/toggle/pixelated orchestration, file-load application, selected-object state-shape reads, target resolution, preview/UV side effects, reusable texture utilities, and mesh texture commands have been separated.
- `ui.js` is now the public UI command facade with the `getChildMesh` compatibility re-export, while `ui-browser-adapter.js` chooses the global UI state getter, UI hooks, material services, root-bound property/toast/export/material DOM adapters, undo, translations, and texture transform persistence; properties panel presentation, selected-property update orchestration, clear/multi panel chrome, toasts, multi-color application, color input syncing, export label refresh, and UI state-shape reads have moved out.
- `object-list.js` is now the public object-list command facade, while `object-list-browser-adapter.js` chooses global object-list state, selection services, translations, DOM roots, and root-bound renderers; open/refresh/select/overlay orchestration lives in `object-list-controller.js`, and recursive row rendering, expand/collapse chrome, root-target lookup, and selected-overlay rendering have moved out.
- `templates.js` is now the public template command facade, while `template-browser-adapter.js` chooses global template state, material creation, selection services, translations, root-bound list DOM rendering, undo, animation compilation, missing-template reporting, and injected registry; the Vite-only template registry remains passed from the browser entry facade, and build/add/category/list orchestration and state-shape reads have moved out.
- `materials.js` is now the public material command facade, while `material-browser-adapter.js` chooses the global material state getter, translations, undo, and root-bound color syncing; material command/runtime orchestration and selected/palette state-shape reads have moved out.
- `i18n.js` is now the public i18n command facade, while `i18n-browser-adapter.js` chooses production translations, localStorage-backed language persistence, and root-bound DOM application; language state/callback orchestration lives in `i18n-controller.js`.
- `animation.js` is now the public animation command facade with the compiler re-export, while `animation-browser-adapter.js` chooses the global animation getter source; playback runtime orchestration and state reads have moved out of `animation-controller.js`.
- `snap.js` is now the public snap command facade, while `snap-browser-adapter.js` chooses the global snap getter source, translations, and root-bound snap DOM rendering; toggle orchestration and state reads have moved out of `snap-controller.js`.
- The production bundle is large because Three.js and all editor features are eagerly loaded.
- Test coverage is still thin for full browser workflows, but `scripts/run-unit-tests.mjs` now has focused coverage across state factories, browser adapters, persistence, import/export browser and DOM flows, texture runtime/editor/panel DOM flows, selection runtime flows, i18n browser/controller flows, snap browser/controller flows, primitive browser/controller/runtime flows, materials, UI browser/controller flows, object/scene/group/bone actions, scene setup/runtime/object-list flows, bone visualization browser/controller flows, animation import/browser/controller/runtime flows, templates, GLB export, shortcut controller/facade, and app bootstrap/wiring.

## Refactor direction

Use a feature-sliced clean architecture rather than a heavy framework rewrite:

```text
src/
  core/
    scene-graph/
    object-schema/
    animation-schema/
    serialization/
  features/
    editor-shell/
    templates/
    import-export/
    texture-editor/
    animation-panel/
    bones/
  ui/
    dom/
    panels/
    bindings/
  data/
    templates/
    i18n/
```

The key boundary is: core modules should not know about DOM ids, localStorage, `window`, modals, or buttons. UI modules can call core modules, not the other way around.

## Specialization

The strongest specialization is not "3D editor"; it is "LLM-friendly retro game asset editor". That gives the product a sharper path:

- Keep object JSON and animation JSON as first-class schemas.
- Make templates, prompts, validators, and exporters part of the product, not side docs.
- Add schema versioning and examples for game engines.
- Avoid competing with full modelling tools; focus on fast generation, editability, and export.

## Split options

Keep one project if the main goal is a self-contained web app.

Split into two packages if templates/prompts/importers become reusable outside the editor:

1. `lowpoly64-core`: schemas, validators, serialization, template registry, animation compiler helpers.
2. `lowpoly64-editor`: DOM UI, Three.js viewport, texture editor, panels, local persistence, export buttons.

This split makes sense once external tools, CLI generation, or game-engine integrations need the same schemas. Until then, keep a single repo and introduce `core/` boundaries first.

## Immediate next refactors

1. Split `texture-editor.js` into paint canvas, preview renderer, UV editor, and modal controller.
   - Progress: per-face UV math is now isolated in `texture-editor-uv.js`.
   - Progress: `texture-editor-preview.js` is now the preview lifecycle facade over scene creation, renderer adapters, hover behavior, texture updates, and the render loop.
   - Progress: paint canvas state, palette, brush size, eraser mode, and public paint command delegation are now isolated in `texture-editor-paint.js`.
   - Progress: paint constants, palette, pointer coordinate scaling, brush radius lookup, and stroke interpolation now live in `texture-editor-paint-core.js`.
   - Progress: paint brush color, brush size, eraser-mode defaults, and tool-state transitions now live in `texture-editor-paint-tool-state.js`.
   - Progress: paint palette container clearing, swatch creation, click listener binding, and color-selection dispatch now live in `texture-editor-paint-palette-ui.js`.
   - Progress: paint undo command callbacks, blank-canvas reset command, image-load surface replacement wiring, snapshot dispatch, and commit/preview callback ordering now live in `texture-editor-paint-command-flow.js`.
   - Progress: normal paint, eraser paint, and interpolated stroke drawing commands now live in `texture-editor-paint-commands.js`.
   - Progress: paint undo snapshot stack management, max history trimming, and restore behavior now live in `texture-editor-paint-history.js`.
   - Progress: paint surface clear/fill/image replacement/source-canvas cloning/fallback fill operations now live in `texture-editor-paint-surface.js`.
   - Progress: paint canvas initialization, source texture restoration, fallback blank fill, initial undo snapshot, previous listener cleanup, flow-state reset, and paint event binding now live in `texture-editor-paint-init-flow.js`.
   - Progress: paint stroke start/move/end state, last pointer tracking, alternate UV-map event delegation, preview refresh, undo snapshot, commit, and after-commit dispatch now live in `texture-editor-paint-flow.js`.
   - Progress: paint canvas event binding and cleanup now live in `texture-editor-paint-events.js`.
   - Progress: image-file input loading, loaded-image application callbacks, error callback, and paint canvas download flow now live in `texture-editor-paint-file-flow.js`.
   - Progress: face-editing orchestration is isolated in `texture-editor-face.js`.
   - Progress: face-editing translation/toast feedback is configured by the lazy `texture-editor.js` composition root, so `texture-editor-face.js` no longer imports global UI/i18n facades.
   - Progress: face initialization for cube/non-cube targets, face-section visibility, preview click binding, global UV reset, and initial six-face UV propagation now lives in `texture-editor-face-init-flow.js`.
   - Progress: face selection/deselection state transition, select-input parsing, preview auto-rotate toggles, highlight callbacks, UI/overlay refresh, and all-face redraw decisions now live in `texture-editor-face-selection-flow.js`.
   - Progress: selected-face mutable state, target mesh, face UV data, UV-map mode/drag state, preview click target, and face-highlight reference now live in `texture-editor-face-state.js`.
   - Progress: UV-map draw start/update/end orchestration, selected-face guard feedback, canvas UV lookup, face UV-data mutation, and redraw side effects now live in `texture-editor-face-uvmap-flow.js`.
   - Progress: texture face UV field updates, selected-face numeric parsing, cube/global UV-submit branching, preview transform handoff, and UI/overlay refresh decisions now live in `texture-editor-face-update-flow.js`.
   - Progress: texture face single-face geometry UV application, all-cube face UV propagation, identity texture reset, global non-cube texture transform creation/application, and transform persistence now live in `texture-editor-face-uv-flow.js`.
   - Progress: texture face global UV input reading/writing, selected-face input rendering, and face-controls visibility now live in `texture-editor-face-ui.js`.
   - Progress: texture face UV overlay positioning, canvas UV coordinate clamping, UV-map drag rectangle calculation, and all-face UV-map canvas drawing now live in `texture-editor-face-overlay.js`.
   - Progress: texture face render DTO mapping, translated face-name list creation, selected-face controls dispatch, selected overlay dispatch, and all-face UV-map overlay dispatch now live in `texture-editor-face-render-flow.js`.
   - Progress: texture preview face hit testing, click-to-face index conversion, highlight line geometry creation, and highlight disposal now live in `texture-editor-face-preview.js`.
   - Progress: texture face preview click-to-selection orchestration, preview click listener cleanup, and highlight replacement/disposal state updates now live in `texture-editor-face-preview-flow.js`.
   - Progress: texture editor brush/eraser/UV-map tool selection, UV-map toggling/reset policy, eraser toggle policy, cursor updates, tool UI refresh, and all-face overlay redraw dispatch now live in `texture-editor-tool-flow.js`.
   - Progress: texture editor canvas commit target resolution, selected editable mesh fallback, paint-canvas lookup, preview-canvas refresh, and texture-transform handoff now live in `texture-editor-canvas-flow.js`.
   - Progress: texture editor open/close lifecycle, no-selection guard, modal show/hide, paint/preview/face initialization, tool UI refresh, and close cleanup/disposal ordering now live in `texture-editor-lifecycle-flow.js`.
   - Progress: tool button and swatch active-state rendering is now isolated in root-bound `texture-editor-tool-ui.js`, composed by the lazy `texture-editor.js` facade through `texture-editor-dom.js`.
   - Progress: selected editable mesh resolution, missing-selection/missing-piece toast decisions, and modal commands now live in `texture-editor-session-controller.js`; `texture-editor-session-browser-adapter.js` chooses global texture-editor state, UI mesh lookup, toast, translations, and root-bound modal DOM services, while `texture-editor-session.js` remains a small public session facade.
   - Progress: canvas-to-mesh texture commit now lives in `texture-editor-commit.js`.
   - Progress: texture editor DOM ids, element creation, canvas detection, and modal chrome now live in root-injectable `texture-editor-dom.js`.
   - Progress: texture editor image-file loading now reuses `browser-image-adapter.js` instead of direct `Image` and object URL handling.
   - Progress: texture preview frame scheduling now lives in `texture-editor-preview-loop.js` and is testable without browser animation APIs.
   - Progress: texture preview runtime state, init/dispose lifecycle, container clearing, auto-rotate hover gating, render-loop composition, frame render dispatch, and renderer cleanup now live in `texture-editor-preview-runtime-flow.js`.
   - Progress: texture preview scene setup, source-mesh cloning/centering, detached texture cloning, renderer creation, and hover auto-rotate binding now live in `texture-editor-preview-scene.js`.
   - Progress: texture preview live canvas-texture replacement, pixelated filter preservation, transform application, material invalidation, and previous-map disposal now live in `texture-editor-preview-texture.js`.
   - Progress: texture preview container lookup is now injected into `texture-editor-preview.js` from the root-bound `texture-editor-dom.js` adapter composed by the lazy `texture-editor.js` facade.
   - Progress: live canvas texture construction, pixelated configuration, and transform application now live in `texture-core.js`, so `texture-editor-preview-texture.js` no longer imports Three.js directly.
   - Progress: browser canvas creation, canvas detection, image-to-data-URL browser wiring, detached canvas-texture creation, and browser texture cloning now live in `browser-canvas-adapter.js`; `texture-core.js` receives canvas factories instead of reading `document`.
   - Progress: texture paint PNG download dispatch now goes through `browser-download-adapter.js` instead of texture-editor DOM link creation.
   - Remaining: texture-editor paint still uses browser canvas APIs at adapter edges for PNG data URL generation, and `texture-core.js` still owns Three.js texture construction as the shared texture boundary.
2. Split `persistence.js` into scene serializer, scene deserializer, texture serializer, storage adapter, and download adapter.
   - Done: scene validation, scene/object serialization, geometry helpers, and texture serialization/restoration are now separate modules.
   - Done: browser JSON download and file parsing now live in `browser-json-adapter.js`.
   - Done: Blob/data-URL download link creation, click dispatch, and Blob URL revocation now live in `browser-download-adapter.js`, reused by JSON export, GLB export, and texture PNG download.
   - Done: scene storage access now lives in `scene-storage.js`, which exposes an injectable `createSceneStorage` factory plus browser-compatible facade functions.
   - Progress: scene serialization/deserialization orchestration, object cleanup/disposal, local-storage save/load flow, JSON export, and JSON import now live in `persistence-runtime-flow.js`.
   - Progress: persistence facade orchestration for runtime state access, selection reset, translated messages, injected storage/JSON adapters, confirm dialog, and public persistence methods now lives in `persistence-controller.js`.
   - Progress: browser dependency assembly for global persistence state, selection, toasts, translations, injected scene storage, browser JSON adapters, and confirm dialogs now lives in `persistence-browser-adapter.js`; `persistence.js` is a small public command facade.
   - Progress: `persistence-controller.js` now receives `getPersistenceState` instead of owning the concrete browser state object for `userObjects` and `pixelatedMode` reads.
   - Progress: object/scene JSON export actions now reuse the shared JSON download adapter, which delegates browser link mechanics to `browser-download-adapter.js`.
   - Progress: object/scene JSON export payload selection, selected/animation-mode object routing, download/copy dispatch, and clipboard fallback now live in `json-export-flow.js`.
   - Progress: browser dependency assembly for global JSON export state, serializers, JSON download, toast, translations, clipboard, and prompt fallback now lives in `json-export-browser-adapter.js`; `json-export-actions.js` is a small public command facade.
   - Progress: texture image-to-data-URL conversion for persistence now delegates through `browser-canvas-adapter.js` into `texture-core.js`, keeping `persistence-textures.js` focused on DTO shape, color metadata, transforms, face UVs, and restoration.
   - Progress: object/animation JSON import modal DOM now lives in root-injectable `json-import-dom.js`, and file import uses `readFileAsJSON` from `browser-json-adapter.js`.
   - Progress: object/animation JSON import parsing, object-vs-animation routing, object build/selection/undo orchestration, selected-group animation import, modal error dispatch, and file-submit flow now live in `json-import-flow.js`.
   - Progress: browser dependency assembly for global import state, root-injected modal DOM, selection, undo, template build, animation import, toasts, translations, and file JSON reading now lives in `json-import-browser-adapter.js`; `json-import.js` is a small public command facade.
   - Progress: `json-import-flow.js` now accepts `getImportState()` as the primary source for selected mesh/group reads used by object-import undo and animation import routing, while preserving older separate getter inputs for tests and compatibility; `json-import-browser-adapter.js` passes only the browser singleton state getter for those reads.
   - Progress: `json-import-browser-adapter.js` receives the Vite-only template builder from `json-import.js`, so the adapter itself remains importable in Node without loading `template-registry.js`.
   - Progress: GLB export source selection for animation mode, multi-selection, single selection, and full scene export now lives in `export-targets.js`.
   - Progress: GLB export node naming, material conversion, texture cloning, emissive cleanup, and raw animation recompilation now live in `export-prepare.js`.
   - Progress: GLB export empty-scene guard, source/prepare orchestration, lazy exporter parse callbacks, Blob download dispatch, and error alert/log handling now live in `glb-export-flow.js`.
   - Progress: browser dependency assembly for global export state, Three classes, Blob/download, lazy `GLTFExporter`, logging, alerts, and translations now lives in `export-browser-adapter.js`; `export.js` is a small public command facade.
   - Progress: release readiness now checks load/import error message wiring in `persistence-controller.js`, where the responsibility moved.
   - Remaining: broader import/export flows still depend on DOM APIs at the edge; that is acceptable while the project remains a browser-only editor.
3. Move inline HTML handlers to `app.js` event bindings and then remove the compatibility `window` API.
   - Done: `index.html` now uses declarative `data-action`, `data-change-action`, and `data-input-action` bindings.
   - Done: the legacy `Object.assign(window, ...)` compatibility layer has been removed.
   - Progress: declarative action dispatch, async error routing, event selector lookup, and listener cleanup now live in `app-action-bindings.js`.
   - Progress: concrete click/change/input command-map creation, dataset argument extraction, lazy texture-editor commands, lazy GLB export, selected-color commands, and multi-color commands now live in `app-action-map.js`; `app.js` now injects browser dependencies and owns composition wiring.
   - Progress: `app-action-map.js` now accepts `getAppActionState()` as the primary source for selected-mesh reads used by random retro color, while preserving the older `getSelectedMesh` input for tests and compatibility; `app.js` passes only the browser singleton state getter for that state read.
   - Progress: app-level chrome refresh wrappers for scene/object lists, selected overlays, export-button labels, delayed selection refreshes, scene import/load refreshes, and action-after-refresh flows now live in `app-chrome-actions.js`.
   - Progress: action context, selection hooks, shortcut DOM/state adapters, import hooks, and UI hook wiring now live in `app-cross-module-hooks.js`; `app.js` passes browser dependencies during initialization.
   - Progress: undo toast feedback is configured through `app-cross-module-hooks.js`, while stack mutation and redo invalidation live in the pure `undo-history.js` core.
   - Progress: lazy-module caching, declarative action-map binding, initialization ordering, browser event registration, palette setup, and DOMContentLoaded bootstrap decisions now live in `app-bootstrap-flow.js`.
   - Progress: canvas selection event binding, template-list render/language refresh binding, texture drop-zone setup, palette color input binding, and multi-color input reads now live in root-bound `app-dom-setup.js`; `app.js` composes that adapter during initialization.
   - Progress: side-panel collapse/open behavior, narrow-viewport sibling closing, and resize scheduling now live in `panel-controller.js`, with `panel-browser-adapter.js` supplying document/window/scene resize dependencies.
   - Progress: keyboard shortcut decision/execution now lives in `shortcut-controller.js`, which has no default `document` dependency; `shortcuts.js` is a facade and `app-cross-module-hooks.js` supplies browser active-element, state, and command adapters.
4. Add unit tests for JSON validation, scene serialization round trips, hierarchy cycles, and animation import.
   - Progress: `scripts/run-unit-tests.mjs` covers 186 focused unit tests across state factories, persistence, scene storage, import/export browser and DOM flows, texture browser/runtime/editor/panel DOM flows, selection browser/runtime flows, i18n browser/controller flows, snap browser/controller flows, primitive browser/controller/runtime flows, material browser/controller flows, UI browser/controller flows, object-list browser/controller/DOM flows, scene object-list browser/controller/DOM flows, template browser/controller/runtime flows, object/scene/group/bone actions, scene setup/runtime, bone visualization browser/controller flows, animation import/browser/controller/runtime flows, animation panel/playback/mode flows, GLB export, DOM adapters, browser canvas adapters, panel controller/adapters, undo history, shortcut controller/facade, and app bootstrap/wiring.
   - Progress: object JSON validation now imports from `json-import-validation.js`, so schema tests do not load DOM, templates, or Vite-only code; validation translation is injected by `json-import-browser-adapter.js`.
5. Code-split help/texture editor/export paths so the initial bundle is smaller.
   - Progress: `texture-editor.js` is loaded dynamically and builds as its own chunk.
   - Progress: GLB export is now lazy; `export.js`/`export-browser-adapter.js` and `GLTFExporter` build as separate chunks loaded only on export.
   - Progress: the app `main` chunk dropped from roughly 805 KB minified to roughly 276.79 KB minified after export/Three chunk separation and later feature splits; export is a lazy chunk around 3.46 KB minified, texture editor is a lazy chunk around 30.26 KB minified, and the shared async texture/download chunk is around 20.33 KB minified.
   - Remaining: the eager Three.js vendor chunk is still larger than 500 KB, currently around 716.17 KB minified, because the viewport/editor runtime needs Three.js at startup.
6. Split broad scene actions by responsibility.
   - Done: `actions.js` is now a public facade over `object-actions.js`, `scene-actions.js`, `group-actions.js`, and `bone-actions.js`.
   - Progress: duplicate/delete, reset/center, group/ungroup, and bone reparenting now have separate modules with smaller helper scopes.
   - Done: `action-context.js` centralizes action runtime dependencies and is configured through `app-cross-module-hooks.js` during bootstrap.
   - Progress: `action-context.js` now normalizes legacy `state` and explicit `getActionState` inputs, and object/scene/group/bone action facades use `getActionState()` instead of reading a concrete state field directly.
   - Progress: action modules no longer import global `state`, `selection`, `undo`, `ui`, or `i18n` directly; tests can inject a fake action context.
   - Progress: object duplicate/delete action flow, including material/texture metadata cloning, selection changes, animation-mode delete guard, and undo/redo callbacks, now lives in `object-action-flow.js`; `object-actions.js` only reads the configured action context and delegates.
   - Progress: scene center-camera and reset-scene action flow, including selected-world-position targeting, deselect-before-reset, child removal, and shared mesh/material disposal, now lives in `scene-action-flow.js` and `scene-disposal.js`; `scene-actions.js` only reads the configured action context and delegates.
   - Progress: group/ungroup action flow, including selected set capture, world-transform preservation, selected group lookup, first-child selection, and undo/redo callbacks, now lives in `group-action-flow.js`; `group-actions.js` only reads the configured action context and delegates.
   - Progress: bone attach/detach action flow, including root-group discovery, pivot reparenting, descendant/depth guards, toast messages, and undo/redo callbacks, now lives in `bone-action-flow.js`; `bone-actions.js` only reads the configured action context and delegates.
   - Remaining: the browser app context still provides global browser state through `getActionState()` and DOM-backed selection/UI services, so this is a boundary improvement rather than a full state-management rewrite.
7. Separate texture utilities from texture UI behavior.
   - Done: `texture-core.js` now owns texture configuration, canvas cloning through injected factories, texture cloning, transform application, and transform persistence helpers.
   - Progress: export, object actions, persistence texture restoration, texture editor preview/commit/face UV, and UI UV updates now import texture utilities from `texture-core.js` instead of the upload/toggle facade.
   - Progress: `texture-core.js` now owns both detached and live canvas texture creation, image-to-data-URL conversion, pixelated configuration, and texture transform application, while `browser-canvas-adapter.js` supplies the browser canvas factory and public browser wrappers.
   - Done: `texture-core.js` no longer imports global `state` or reads browser `document`; callers pass pixelated filtering explicitly and browser canvas factories are injected at the edge.
   - Done: `browser-image-adapter.js` owns browser image-file and data-URL loading through `FileReader` and `Image`.
   - Done: `texture-panel-dom.js` owns texture panel preview, UV controls, and drag/drop DOM behavior through an injectable root adapter composed by `texture-browser-adapter.js`.
   - Done: `texture-commands.js` owns mesh-level apply/toggle/filter operations and can be unit tested without selected-object state or DOM.
   - Progress: texture editor image load and serialized texture restoration both reuse `browser-image-adapter.js`.
   - Progress: texture file-load application, selected-object target resolution, panel preview/UV updates, success/error toasts, selected texture toggles, and pixelated filter toggles now live in `texture-runtime-flow.js`.
   - Progress: texture upload input handling, drag/drop binding, apply texture action labels, selected texture toggles, pixelated mode toggles, and explicit runtime state access now run through `texture-controller.js`.
   - Progress: `texture-controller.js` now receives `getTextureState` as the primary source for texture settings and selected object, while preserving the older `getSelectedObject` input for tests and compatibility.
   - Progress: browser dependency assembly for global texture state, Three.js texture/filter classes, undo labels, toasts, translations, image loading, and texture panel DOM now lives in `texture-browser-adapter.js`; `textures.js` is a small public command facade.
   - Remaining: `texture-browser-adapter.js` still chooses browser runtime dependencies for the texture facade.
8. Split selection behavior by responsibility.
   - Progress: selected mesh highlight/restore logic now lives in `selection-highlight.js` and is covered by a unit test.
   - Progress: raycast pointer conversion, mesh/pivot target resolution, and double-click root target resolution now live in `selection-raycast.js`.
   - Progress: selected header/timeline DOM updates now live in root-injectable `selection-dom.js`.
   - Progress: single-selection, multi-selection, transform-control attach/detach, highlight/unhighlight transition helpers now live in `selection-state.js`.
   - Progress: single-selection, deselection, multi-selection header/panel sync, export-button refresh, timeline hiding, and multi-selection promotion feedback now live in `selection-ui-flow.js`.
   - Progress: mouse/double-click selection decisions, multi-select toggles, animation-mode guards, and bone-click routing now live in `selection-event-decision.js`.
   - Progress: decision execution now lives in `selection-decision-executor.js` and receives handlers for multi-select, attach-bone, select, and deselect.
   - Progress: mouse/double-click pointer flow, raycast target picking, bone-picking gates, and decision execution now live in `selection-pointer-flow.js`.
   - Progress: selection runtime composition for mouse/double-click handlers, single/multi selection orchestration, transform-control adapters, hook callbacks, and UI feedback now lives in `selection-runtime-flow.js`.
   - Progress: selection facade orchestration for raycaster creation, runtime composition, injected UI services, transform-control state access, and app-level hook storage now lives in `selection-controller.js`.
   - Progress: `selection-controller.js` now receives `getSelectionState` as the primary source for selection state and `transformControls`, while preserving `getTransformControls` as a legacy fallback.
   - Progress: browser dependency assembly for global selection state, scene bone raycasting, translations, root-injected selection DOM, highlighting, and UI services now lives in `selection-browser-adapter.js`; `selection.js` is a small public command facade.
   - Remaining: `selection-browser-adapter.js` still chooses browser runtime dependencies for the selection facade.
9. Separate i18n core from browser adapters.
   - Done: translation lookup and language toggling helpers now live in `i18n-core.js`.
   - Done: localStorage access for language preference now lives in `i18n-storage.js`.
   - Done: DOM application of `[data-i18n]`, placeholders, titles, and language flag now lives in root-injectable `i18n-dom.js`.
   - Progress: language state, translation application orchestration, and language-change callbacks now live in `i18n-controller.js` with injectable translations, storage, core, and DOM adapters.
   - Progress: browser dependency assembly for production translations, localStorage-backed language persistence, and root-bound DOM application now lives in `i18n-browser-adapter.js`; `i18n.js` remains the public facade used by feature modules.
10. Split small UI commands into command/core and DOM adapters.
   - Progress: snap settings now live in `snap-core.js` and are testable without global state or DOM.
   - Progress: snap indicator rendering now lives in root-injectable `snap-dom.js`.
   - Progress: snap toggle orchestration for state transition, transform controls, translated indicator refresh, and explicit runtime state access now lives in `snap-controller.js`.
   - Progress: `snap-controller.js` now receives `getSnapState` instead of owning the concrete browser state object.
   - Progress: browser dependency assembly for global snap state, translations, and root-bound snap DOM rendering now lives in `snap-browser-adapter.js`; `snap.js` is a small public command facade.
   - Progress: mesh material construction now lives in `material-factory.js` and color picker syncing now lives in root-injectable `material-dom.js`.
   - Progress: material replacement, flat-shading/wireframe application, mesh color mutation, and palette color selection now live in `material-commands.js`.
   - Progress: quick color application, input sync, and undo action registration now route through `material-quick-color-flow.js`.
   - Progress: material creation from global settings, selected-material replacement, flat/wire setting toggles, and selected quick-color lookup now live in `material-runtime-flow.js`.
   - Progress: material facade runtime orchestration for material creation, material replacement, flat/wire toggles, palette color selection, color mutation, quick color, and explicit runtime state access now lives in `material-controller.js`.
   - Progress: `material-controller.js` now receives `getMaterialState` as the primary source for material settings, selected mesh, and retro palette, while preserving the older separate getter inputs for tests and compatibility.
   - Progress: browser dependency assembly for global material state, translations, undo, and root-bound color DOM sync now lives in `material-browser-adapter.js`; `materials.js` is a small public command facade.
   - Remaining: `material-browser-adapter.js` still chooses browser runtime dependencies for the material facade.
11. Split animation panel by UI responsibility.
   - Progress: timeline select index, option rendering, progress bar/time text, and play/stop button class updates now live in root-injectable `animation-timeline-dom.js`.
   - Progress: modal and animation-mode import text/error DOM access now lives in root-injectable `animation-import-dom.js`.
   - Progress: animation mode panel/banner visibility and object-name DOM updates now live in root-injectable `animation-mode-dom.js`.
   - Progress: animation mode list row rendering now lives in root-injectable `animation-list-dom.js` and receives play/delete callbacks.
   - Progress: animation mode activation/deactivation state, scene object visibility toggling, active animation group lookup, clip availability checks, and clip deletion now live in `animation-mode-state.js`.
   - Progress: animation mode enter/exit/delete orchestration now lives in `animation-mode-flow.js` with injected selection, camera, toast, timeline, and list-refresh side effects.
   - Progress: animation timeline frame scheduling now lives in `animation-timeline-loop.js`.
   - Progress: animation import validation, target checks, importer result handling, warning feedback formatting, and submit success/error UI orchestration now live in `animation-import-flow.js`.
   - Progress: animation JSON normalization, validation, single/multiple import, compile dispatch, no-track errors, warning aggregation, and imported-count toast orchestration now live in `animation-import-core.js`.
   - Progress: browser dependency assembly for animation import translation, toast, and animation compilation now lives in `animation-import-browser-adapter.js`; `animation-import.js` is a small public import facade.
   - Progress: animation panel active group, selected timeline index, modal import target, and animation-mode import target resolution now live in `animation-panel-targets.js`.
   - Progress: animation panel runtime orchestration for playback, modal/mode import submit, timeline-loop startup, animation-mode enter/exit/list/play/delete/import now lives in `animation-panel-runtime-flow.js`.
   - Progress: animation panel facade composition for target creation, runtime controller wiring, playback/import/timeline/mode dependencies, explicit runtime state access, and public command delegation now lives in `animation-panel-controller.js`.
   - Progress: `animation-panel-controller.js` now receives `getAnimationState` before creating panel targets and runtime controller options.
   - Progress: browser dependency assembly for animation-panel playback, root-bound timeline/list/import/mode DOM, selected-index target reads, selection/camera, toast, and translations now lives in `animation-panel-browser-adapter.js`; `animation-panel.js` is a small public command facade.
   - Progress: animation timeline rendering, animation-mode list refresh, and animation-mode clip playback orchestration now live in `animation-panel-flow.js`.
   - Progress: animation playback decisions for play, restart-on-select-change, play/stop toggle, and play-by-index now live in `animation-playback-flow.js`.
   - Remaining: `animation-panel-browser-adapter.js` still chooses browser dependencies: global animation getter source, playback service facade, root-bound animation DOM adapters, selection/camera services, toast, and translation services.
12. Split animation core from playback runtime.
   - Done: clip compilation now lives in `animation-compiler.js` and has no dependency on global `state`.
   - Progress: animation import, template build, scene deserialization, and export now import the compiler directly instead of loading playback runtime.
   - Done: playback/mixer state transitions, mixer/action setup, play/pause/resume/stop/toggle behavior, progress calculation, and mixer updates now live in `animation-runtime.js` with injected state and mixer class support.
   - Progress: animation facade runtime orchestration for play/pause/resume/stop/toggle/progress/mixer-update and explicit runtime state access now lives in `animation-controller.js`.
   - Progress: `animation-controller.js` now receives `getAnimationState` instead of owning the concrete browser state object.
   - Progress: browser dependency assembly for the global animation getter source now lives in `animation-browser-adapter.js`; `animation.js` remains a small public command facade and keeps the `compileAnimation` re-export.
13. Split UI facade by panel responsibility.
   - Progress: single/multi selection field visibility, clear-selection chrome, object transform fields, material/color inputs, action-button visibility, and UV controls now live in root-injectable `properties-panel-dom.js`.
   - Progress: toast rendering now lives in root-injectable `toast-dom.js`, export-button label rendering now lives in root-injectable `export-button-dom.js`, and UI color input syncing uses root-injectable `material-dom.js`.
   - Progress: property target resolution, material type/color lookup, transform/name updates, action visibility calculation, and texture UV commands now live in `property-commands.js`.
   - Progress: color/material undo-redo action creation now lives in `property-history-actions.js`.
   - Progress: selected-object properties panel presentation now lives in `properties-panel-presenter.js`.
   - Progress: export-button selected-state calculation now lives in `export-button-state.js`.
   - Progress: object-list recursive row rendering, expand/collapse toggle rendering, root-group double-click targeting, and selected-overlay DOM rendering now live in root-injectable `object-list-dom.js`.
   - Progress: object-list open/refresh/select/overlay orchestration now lives in `object-list-controller.js`.
   - Progress: browser dependency assembly for global object-list state, selection services, translations, DOM roots, and root-bound object-list renderers now lives in `object-list-browser-adapter.js`; `object-list.js` is a small public command facade.
   - Progress: selected-object transform/name/color/material/UV update orchestration now lives in `selected-property-flow.js` with injected state, DOM reads, history registration, and material/texture side effects.
   - Progress: UI facade runtime orchestration for properties panel rendering, clear/multi-selection panel chrome, selected-property commands, toasts, multi-color application, color input syncing, export label refresh, and explicit runtime state access now lives in `ui-controller.js`.
   - Progress: `ui-controller.js` now accepts a single `getUIState()` source for `selectedMesh`, `selectedMeshes`, `userObjects`, and `bonesVisible`, while preserving the older separate getter inputs for tests and compatibility.
   - Progress: browser dependency assembly for global UI state, UI hooks, material services, root-bound property/toast/export/material DOM adapters, undo, translations, and texture transform persistence now lives in `ui-browser-adapter.js`.
   - Progress: `ui.js` still exposes the existing command API, but no longer owns direct DOM reads/writes, low-level property/UV mutations, inline color/material undo-redo action bodies, selected-property command behavior, full selected-object panel presentation, UI runtime orchestration, or UI state-shape reads inside the controller.
   - Remaining: `ui-browser-adapter.js` still chooses browser runtime dependencies for the UI facade.
14. Split templates by construction and presentation.
   - Progress: template list category/template labels, collapsible sections, button rows, and selection callbacks now live in root-injectable `template-list-dom.js`.
   - Progress: template geometry construction now lives in `template-geometry.js`.
   - Progress: template group hierarchy assembly, pivot depth checks, pivot-relative mesh placement, material creation through injected dependencies, and template animation compilation now live in `template-group-builder.js`.
   - Progress: template insertion, first selection target lookup, nested-selection undo cleanup, and undo/redo action creation now live in `template-actions.js`.
   - Progress: template registry lookup, category grouping, runtime material-type selection, missing-template handling, and insertion orchestration now live in `template-runtime-flow.js`.
   - Progress: template facade runtime orchestration for build, add, category lookup, injected list rendering, and explicit runtime getters now lives in `template-controller.js`.
   - Progress: `template-controller.js` now accepts a single `getTemplateState()` source for `currentMaterialType`, `selectedMesh`, and `userObjects`, while preserving the older separate getter inputs for tests and compatibility.
   - Progress: browser dependency assembly for template state, material creation, selection services, translations, root-bound template-list DOM rendering, undo, animation compilation, missing-template reporting, and registry injection now lives in `template-browser-adapter.js`.
   - Progress: `templates.js` keeps the existing public `buildGroupFromDefinition`, `addTemplate`, `getCategories`, and `generateTemplateListUI` facade, but no longer owns template-list DOM construction, geometry construction, group assembly, registry lookup, category grouping, runtime material selection, insertion action internals, facade runtime orchestration, or `state` shape reads inside the controller.
   - Remaining: `templates.js` still passes the Vite-only browser template registry into `template-browser-adapter.js`; the adapter itself is importable in Node because the registry is injected.
15. Split scene runtime by responsibility.
   - Progress: bone visualization target discovery, helper sphere/line rendering, bone raycast picking, toggle state, and per-frame helper updates now live in `bone-visualization-controller.js`.
   - Progress: browser dependency assembly for global bone state and Three helper classes now lives in `bone-visualization-browser-adapter.js`; `bone-visualization.js` is a small public command facade with the `findBoneTargets` compatibility re-export.
   - Progress: scene/camera/renderer setup, default world objects, user-object group creation, OrbitControls defaults, and viewport resize math now live in `scene-setup.js`.
   - Progress: TransformControls creation, dragging/change event handlers, transform snapshotting, pivot-mesh compensation, and undo/redo action creation now live in `scene-transform-controls.js`.
   - Progress: scene canvas/viewport lookup, resize listener binding, and device pixel ratio lookup now live in root/window-bound `scene-dom.js`.
   - Progress: scene object-list empty-state rendering, row rendering, icon/name composition, and row select callback binding now live in root-injectable `scene-object-list-dom.js`.
   - Progress: scene object-list refresh/select orchestration now lives in `scene-object-list-controller.js`.
   - Progress: browser dependency assembly for global scene state, selection side effects, translations, object-list refresh, selected-overlay refresh, and root-bound scene object-list renderer injection now lives in `scene-object-list-browser-adapter.js`; `scene-object-list.js` is a small public command facade.
   - Progress: scene render-loop scheduling, OrbitControls update calls, animation mixer update calls, bone update calls, and renderer invocation now live in `scene-render-loop.js`.
   - Progress: scene runtime initialization, initialized service assignment into `state`, resize lifecycle, render-loop startup, and previous-runtime cleanup now live in `scene-runtime-flow.js`.
   - Progress: scene facade composition for runtime controller wiring, setup/DOM/render-loop adapters, animation/bone updates, undo, property refresh, and explicit runtime state access now lives in `scene-controller.js`.
   - Progress: `scene-controller.js` now receives `getSceneState` before creating the scene runtime controller.
   - Progress: browser dependency assembly for scene setup, root/window-bound DOM adapters, render loop, animation/bone updates, undo, and property refresh now lives in `scene-browser-adapter.js`; `scene.js` is a small public command facade.
   - Progress: `scene.js` keeps compatibility re-exports for `raycastBones` and `toggleBones`, so selection/app imports do not need to know the new module boundary yet.
   - Remaining: `scene-browser-adapter.js` still chooses the global scene getter source and browser runtime dependencies for the scene facade.

