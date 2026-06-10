## 1. Setup And Tooling

- [x] 1.1 Add non-blocking code-size audit script and package script.
- [x] 1.2 Add safe dry-run local artifact cleanup script and package script.

## 2. Test Structure

- [x] 2.1 Extract Avatar Forge E2E helpers into shared helper modules.
- [x] 2.2 Split Avatar Forge E2E scenarios into smaller specs by workflow.

## 3. Avatar Forge Refactor

- [x] 3.1 Extract Avatar Forge preview runtime and diagnostics while preserving facade exports.
- [x] 3.2 Extract Avatar Forge form and catalog control helpers while preserving behavior.

## 4. Motion Ripper Refactor

- [x] 4.1 Extract Motion Ripper constants, capture state helpers, and pure pose/analysis utilities.
- [x] 4.2 Extract Motion Ripper video source, overlay, and frame editing helpers.
- [x] 4.3 Extract Motion Ripper preview runtime, character builder, retargeting, and constraints.

## 5. Animation Mode Refactor

- [x] 5.1 Extract Animation Mode layout and rig preview helpers.
- [x] 5.2 Extract Animation Mode reference video, pose library, editor, and playback helpers.

## 6. Secondary Refactors

- [x] 6.1 Extract Texture editor paint, UV, preview, processing, and sprite strip helpers.
- [x] 6.2 Extract SVG and Viewport responsibilities where they have clear internal boundaries.

## 7. Verification

- [x] 7.1 Run focused checks after each subsystem and final verification suite.
