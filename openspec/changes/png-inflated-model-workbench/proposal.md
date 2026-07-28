## Why

Retrovisor can apply transparent PNGs to flat planes, but it cannot turn their
silhouette into a textured low-poly volume. A local PNG-to-model workbench
would let artists convert sprites and side-view illustrations into useful 2.5D
assets, while manual depth painting would make the automatic result correctable
without external modelling software.

## What Changes

- Add a `PNG → FLAT MODEL` entry point and native modal workbench.
- Accept bounded PNG/WebP image input with alpha, crop transparent padding, and
  preview the detected silhouette.
- Generate a closed, textured low-poly mesh whose front/back depth is derived
  from the silhouette distance field.
- Provide controls for alpha threshold, target size, mesh density, thickness,
  bulge curve, smoothing, back-face texture mirroring, and side color.
- Add a paintable local depth-adjustment map with inflate, deflate, smooth, and
  erase/reset behavior.
- Preview regeneration without mutating the scene, then insert or update the
  result as one undoable scene object.
- Preserve source image, generation settings, and manual depth map through
  save/load and compact JSON roundtrip while keeping normal GLB export working.
- Keep processing local in the browser with bounded image/mesh complexity and
  no provider calls.

## Capabilities

### New Capabilities

- `png-inflated-model-workbench`: Transparent-image ingestion, alpha silhouette
  analysis, inflated mesh generation, local depth painting, preview, insertion,
  update, and export behavior.

### Modified Capabilities

- `scene-persistence`: Persist and restore PNG-derived source metadata, settings,
  manual depth adjustments, texture, and generated geometry.
- `undo-system`: Treat PNG-model insertion and regeneration as atomic undoable
  actions.

## Impact

- New modules under `src/modules/png-model/` for pure image analysis, geometry
  generation, model metadata, workbench HTML, and UI control.
- New editor menu entry and lazy bindings, following the existing SVG workbench
  pattern.
- Incremental changes to scene persistence, selection/object-list refresh, and
  help/documentation.
- New unit tests for alpha bounds, distance-based inflation, UV/mesh validity,
  depth-map painting, metadata bounds, and persistence helpers, plus a focused
  Playwright workflow.
- No new SaaS service, model dependency, shell/filesystem capability, or
  breaking scene-format migration.
