## 1. SVG Domain Setup

- [x] 1.1 Add the SVG-domain module structure under `src/modules/svg/` and define a shared metadata shape for SVG-derived groups.
- [x] 1.2 Add any required dependency support for text-to-SVG generation, keeping the rest of the feature on top of existing Three.js utilities.
- [x] 1.3 Add representative sample SVG fixtures or inline test cases for filled SVG, stroke-only icon, pixel output, and text output.

## 2. Source Generation And Conversion

- [x] 2.1 Port/adapt `3dsvg` source helpers for pixel-to-SVG, text-to-SVG, and stroke rasterization into vanilla modules.
- [x] 2.2 Implement SVG parsing and extrusion using `SVGLoader`, `ExtrudeGeometry`, and mesh centering/scaling adapted to Retrovisor.
- [x] 2.3 Convert the generated geometry into scene-compatible `custom` mesh data and create a helper that inserts or updates SVG-derived groups directly in `userObjects`.
- [x] 2.4 Add complexity preflight, progress reporting, and warning/cancel behavior for expensive SVG imports.

## 3. Workbench UI Integration

- [x] 3.1 Add a new SVG workbench entrypoint to the editor UI and inject the modal HTML following the existing modal pattern.
- [x] 3.2 Implement workbench state management for source modes, SVG preview, import settings, and confirm/cancel actions.
- [x] 3.3 Wire the workbench through `bindings.js` and add the ability to reopen it for a selected SVG-derived object.
- [x] 3.4 Record insert/update operations in undo/redo and keep selection/object-list state in sync after import.

## 4. Persistence And Roundtrip

- [x] 4.1 Extend scene serialization/deserialization to persist optional SVG source metadata on SVG-derived groups.
- [x] 4.2 Rehydrate SVG-derived groups on load so the geometry still works normally and the workbench can reopen with saved source/settings.
- [x] 4.3 Verify that imported SVG objects continue to work with materials, textures, save/load, GLB export, and compact `svgSource` JSON export/import.

## 5. Validation And Follow-up Decisions

- [x] 5.1 Manually verify the OpenSpec scenarios with one filled SVG, one stroke icon, one pixel-drawn source, and one text-generated source.
- [x] 5.2 Measure representative vertex/face counts and JSON output sizes for imported SVG models to decide whether a follow-up change is needed for `exportObjectJSON`/`json-object-import` roundtrip limits.
- [x] 5.3 Update user-facing help or release notes once the workflow is implemented and verified.

> Validation note: compact `svgSource` object JSON export/import no longer needs a follow-up for legacy `custom` payload limits, but text-generated SVGs can still create very large live meshes in scene persistence and runtime. That is a geometry-complexity/performance follow-up, not a `json-object-import` blocker.
