## 1. Image analysis and depth data

- [x] 1.1 Add validated PNG-model settings, bounded metadata, and derived-group helpers
- [x] 1.2 Implement alpha-bound detection, bounded grid sampling, and silhouette distance field
- [x] 1.3 Implement the density-independent manual depth map and paint operations

## 2. Mesh and model generation

- [x] 2.1 Generate closed front/back and side-wall custom geometry with valid UVs and normals
- [x] 2.2 Build textured PNG-derived scene groups and reusable preview/update snapshots
- [x] 2.3 Add unit tests for silhouette analysis, settings bounds, painting, depth influence, and geometry validity

## 3. Workbench experience

- [x] 3.1 Add the PNG to Flat Model modal, source picker, controls, paint canvas, warnings, and actions
- [x] 3.2 Add isolated interactive 3D preview with debounced regeneration and cleanup
- [x] 3.3 Add lazy menu and selected-object edit entry points plus localized labels

## 4. Scene integration

- [x] 4.1 Insert and regenerate derived groups as atomic undo/redo actions with normal scene refresh events
- [x] 4.2 Persist and restore PNG source, settings, analysis, depth map, texture, and generated geometry
- [x] 4.3 Preserve editable PNG-derived groups through compact object JSON and existing GLB export

## 5. Validation and documentation

- [x] 5.1 Add a Playwright flow covering image load, manual inflation, insert, undo/redo, reopen, and update
- [x] 5.2 Document the workflow, input guidance, controls, limitations, and troubleshooting
- [x] 5.3 Run unit, integration/build, focused E2E, and repository verification; fix regressions
