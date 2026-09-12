## Why

Retrovisor can render and export characters, but the creation and interchange paths lose editable geometry and manual changes. The user needs a small, dependable PSX/N64 body-and-head workflow with reusable articulated bodies and JSON/GLB interchange.

## What Changes

- Add a focused creator with PSX and N64 bodies, interchangeable simple heads, proportion controls and a live preview.
- Keep bodies reusable and preserve the existing humanoid rig and animation controls.
- Make character recipes and complete editable models importable and exportable as JSON.
- Add GLB import and preserve editable character data and animations across app-generated GLB roundtrips.
- Correct custom geometry serialization and preserve manual avatar edits in saved scenes.
- Verify actual import/export, save/load, rig motion, geometry budgets and visual results.

## Capabilities

### New Capabilities
- `reusable-retro-characters`: Simple PSX/N64 creation, reusable rigged bodies and complete JSON/GLB interchange.

### Modified Capabilities
None. Existing generic editor workflows remain supported.

## Impact

New character studio modules and UI entry point; character conversion, persistence, JSON import and GLB import/export modules; focused tests and user documentation. Reuses Three.js and the current humanoid rig; no additional dependencies.
