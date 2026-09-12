## 1. Character studio

- [x] 1.1 Generate distinct simple PSX/N64 bodies and heads with canonical rig metadata and bounded geometry.
- [x] 1.2 Add live preview, proportions/colors, body-only creation and head-only replacement preserving body edits.
- [x] 1.3 Wire studio entry and selected-character editing into the app UI.

## 2. Reliable interchange and persistence

- [x] 2.1 Repair custom geometry conversion, model metadata, root transforms and JSON import dispatch.
- [x] 2.2 Preserve actual avatar children and studio metadata through scene save/load with legacy compatibility.
- [x] 2.3 Add embedded GLB import and native scene/animation snapshot JSON persistence.
- [x] 2.4 Preserve native clips and unlit materials during GLB export.

## 3. Verification and delivery

- [x] 3.1 Verify geometry budgets, finite bounds, hierarchy and recipe validation with focused unit tests.
- [x] 3.2 Verify both styles through JSON/GLB/save-load, actual animation motion, head replacement and undo in browser tests.
- [x] 3.3 Inspect rendered characters and refine their shapes and UI as needed.
- [x] 3.4 Run relevant regression checks/build and provide usable example JSON/GLB files and short user instructions.
