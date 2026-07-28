## Why

The PNG model workbench reports mesh density numerically, but users cannot see
the generated topology or understand how density changes the result. A visual
mesh inspection mode makes polygon cost and silhouette quality directly
observable before adding more advanced movable inflation controls.

## What Changes

- Add independent preview toggles for polygon edges and mesh vertices.
- Render overlays on top of the textured preview without changing the generated
  model, exported material, or main scene.
- Replace coarse density presets with a continuous bounded density slider.
- Show the selected density plus live vertex and triangle counts beside the
  control and in analysis output.
- Preserve inspection choices for the current browser session while keeping
  them out of scene/object serialization because they are editor-only state.
- Add focused automated and visual coverage for the overlay and density flow.

## Capabilities

### New Capabilities

- `png-model-mesh-inspection`: Preview-only polygon/vertex overlays, continuous
  mesh-density control, topology counters, and non-persistent inspection state.

### Modified Capabilities

None.

## Impact

- PNG workbench HTML and UI state under `src/modules/png-model/`.
- Preview runtime gains disposable wireframe and point overlays.
- PNG E2E and unit coverage gain density/inspection assertions and screenshots.
- No new dependency, scene-format change, MCP tool, or GLB behavior change.
