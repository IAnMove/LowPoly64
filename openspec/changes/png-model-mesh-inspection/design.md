## Context

The PNG workbench generates a bounded regular-grid mesh and already reports
topology counts after regeneration. Density is currently selected from four
presets, while the preview renders only the final textured materials. Users
therefore cannot connect density changes with the actual vertices, triangle
layout, outline fidelity, or performance cost.

This change is deliberately limited to inspection and global density. Movable
inflation handles remain a later change because they are semantic depth controls,
not raw topology editing.

## Goals / Non-Goals

**Goals:**

- Show polygon edges and vertices independently over the textured 3D preview.
- Let users choose any supported integer density and see its live value.
- Keep live vertex/triangle counts close to the density control.
- Avoid changing generated objects, serialization, undo history, or exports.

**Non-Goals:**

- Move, insert, or delete individual mesh vertices.
- Add local adaptive remeshing or retriangulation.
- Add movable inflation handles in this change.
- Expose inspection state through MCP or persist it in scene JSON.

## Decisions

### Use preview-only overlay objects

The preview runtime will derive `WireframeGeometry` line segments and `Points`
objects from each generated preview mesh. These objects are attached to a
dedicated overlay group, use depth-tested high-contrast materials, and are
disposed whenever the preview model changes or closes.

Changing the underlying mesh materials to wireframe was considered, but that
would hide the texture and make it harder to compare topology with appearance.
Overlay objects preserve both simultaneously.

### Keep edge and vertex visibility independent

Two checkboxes allow texture only, texture plus polygon edges, texture plus
vertices, or all three. The choices live in module-level workbench UI state so
they survive closing/reopening during the browser session, but they are not part
of the PNG model recipe.

### Replace presets with a bounded integer slider

Density becomes a slider from 12 through 72 with step 1 and a live numeric
label. The existing normalization remains the source of truth and existing
recipes continue to load because their numeric density already uses this range.
Regeneration remains debounced.

### Report generated topology, not estimated topology

The control area shows counts from the most recent successful payload. While a
new mesh is generating it indicates that counts are pending. This avoids
displaying estimates that differ around transparent silhouettes.

## Risks / Trade-offs

- [Dense wireframes can become visually noisy] -> Keep overlays independently
  toggleable and off by default.
- [Point overlays can obscure the texture] -> Use small bounded point size,
  depth testing, and a distinct color.
- [Slider dragging can regenerate repeatedly] -> Reuse the existing debounced
  regeneration path and update only the numeric label immediately.
- [Wireframe geometry allocates extra GPU memory] -> Build it only when needed
  for the current preview and dispose it on replacement/close.

## Migration Plan

Existing recipes need no migration. Their stored numeric density maps directly
to the slider. Inspection state starts disabled and is never serialized.

## Open Questions

- A later change can introduce semantic inflation handles with normalized image
  position, radius, and signed amount after this inspection layer is proven.
