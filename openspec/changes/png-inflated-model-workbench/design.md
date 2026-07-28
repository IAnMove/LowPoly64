## Context

Retrovisor already has a Three.js scene graph, custom geometry serialization,
texture persistence, atomic undo actions, GLB export, and an SVG workbench that
provides a useful integration pattern. Transparent images can be used as
textures, but there is no local workflow that derives a closed volume from the
alpha silhouette or lets the user correct inferred depth.

The input is a single orthographic-looking image, so real hidden geometry cannot
be recovered. The feature therefore produces an intentionally 2.5D asset: the
front and back follow the source silhouette while their separation is inferred
from distance to the silhouette edge and a user-painted correction map.

## Goals / Non-Goals

**Goals:**

- Convert a bounded transparent PNG or WebP into a closed, textured mesh locally.
- Make the automatic depth result understandable and manually correctable.
- Insert and regenerate the result as one scene object and one undoable action.
- Reuse existing texture, custom geometry, persistence, event, selection, and
  export systems.
- Keep generated geometry and stored source metadata bounded.

**Non-Goals:**

- Reconstruct unseen anatomy or produce a watertight production sculpt from one
  photograph.
- Call an image, depth, or generative model service.
- Add arbitrary file-system access or server-side image processing.
- Replace the existing mesh editing or texture tools.

## Decisions

### Use a bounded alpha grid and distance field

The source alpha is cropped to its non-transparent bounds and sampled into a
regular grid whose long axis is controlled by the density setting. A cell is
inside the silhouette when its sampled alpha passes the threshold. A chamfer
distance field estimates distance from the nearest boundary; normalized
distance, thickness, and a bulge exponent determine front/back displacement.

This is deterministic, fast, dependency-free, and robust for sprite-like input.
Contour triangulation was considered, but holes, narrow appendages, and
triangulation failures would make the first version less predictable.

### Represent the result as a derived group with two custom meshes

The generated object is a group containing a front/back surface mesh with the
source texture and a side-wall mesh with a configurable solid color. Splitting
the meshes avoids introducing multi-material persistence complexity and lets the
existing custom-geometry and GLB paths work unchanged.

Boundary edges create side quads, so every exposed grid edge is closed. Front
and back UVs map to the cropped region of the normalized source image; the back
can be mirrored.

### Store manual correction independently of mesh density

A fixed-size signed depth map is stored with the derived group. Painting tools
apply inflate, deflate, smooth, or erase operations with bounded radius and
strength. Mesh generation samples the map bilinearly, so users may change mesh
density without losing edits. The map is quantized for persistence.

### Preview is isolated from the scene

The modal owns a small Three.js preview scene. Changing controls or painting
regenerates only the preview. `Insert` creates a new scene group; `Update`
replaces the selected PNG-derived group's generated contents and metadata.
Cancel never mutates the main scene.

### Preserve normalized source and generation recipe

Input images are normalized to a bounded data URL before generation. The group
stores the normalized source, crop/analysis data, validated generation settings,
and quantized manual map. Scene save/load serializes these fields. Compact object
JSON carries the same recipe and generated children, allowing import even when a
future generator changes.

### Integrate lazily

The menu and properties button load the PNG workbench module on first use,
matching the SVG workbench pattern and keeping initial application cost small.

## Risks / Trade-offs

- [Grid silhouettes can have stair-stepped edges] -> Offer density levels,
  surface smoothing, and bounded geometry size; document that high-resolution
  source art still benefits from clean alpha.
- [One image cannot reveal true back-side shape] -> Label the output 2.5D, mirror
  the back by default, and expose local depth corrections.
- [Thin transparent details can disappear] -> Classify a cell by maximum sampled
  alpha and report discarded/tiny-component warnings.
- [Large embedded images can exceed localStorage] -> Normalize source dimensions
  and file size, reject oversized inputs clearly, and reuse existing storage
  failure handling.
- [Frequent painting could make preview expensive] -> Bound the grid, debounce
  generation, and update only after a paint stroke.
- [Regeneration can break external references to child meshes] -> Treat the
  derived group as the stable public object and replace only its generated
  children atomically.

## Migration Plan

1. Add pure analysis, depth-map, geometry, and metadata modules with unit tests.
2. Add the isolated workbench and lazy menu/property bindings.
3. Add atomic scene insertion/update actions and metadata persistence.
4. Add focused E2E coverage and user documentation.

Existing scenes contain no PNG-derived metadata and continue to load unchanged.
Rollback consists of removing the new entry points and modules; saved generated
children remain ordinary custom meshes even if recipe editing is unavailable.

## Open Questions

- A later version may replace the grid boundary with contour simplification and
  constrained triangulation if visual testing shows a meaningful quality gain.
- A later provider-backed mode could infer a depth map, but it is intentionally
  outside this local deterministic MVP.
