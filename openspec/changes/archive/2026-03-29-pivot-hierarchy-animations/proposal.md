## Why

All pieces in a character group are flat siblings that rotate around their geometry center. When an arm animates, it spins from its midpoint instead of the shoulder joint. This makes walk, wave, attack, and any rotation-based animation look robotic and unnatural. Adding pivot points and optional parent-child hierarchy fixes this with minimal architectural change — the same animation data produces dramatically better results.

## What Changes

- **New `pivot` field on pieces**: Specifies the rotation/scale origin point in group space. Implemented as an intermediate `THREE.Group` (PivotGroup) wrapping the mesh, with the mesh offset so the pivot is at the group's local origin. Without `pivot`, behavior is unchanged (rotate around piece center).
- **New `parent` field on pieces**: Allows nesting pieces under other pieces. Moving/rotating the torso automatically moves arms, head, etc. Transforms become local to the parent's pivot. Without `parent`, pieces attach to the root group as before.
- **PivotGroup scene graph**: Internal representation changes from `RootGroup > [Mesh, Mesh, ...]` to `RootGroup > [PivotGroup > Mesh, PivotGroup > [Mesh, PivotGroup > Mesh, ...]]`.
- **Updated serialization**: JSON export reconstructs `pivot` and `parent` from the PivotGroup hierarchy. GLB export preserves the hierarchy and recompiled animation clips.
- **Selection/gizmo adaptation**: Clicking a mesh inside a PivotGroup attaches the transform gizmo to the PivotGroup, so rotation uses the correct pivot.
- **Updated LLM prompt**: `ask.md` documents `pivot` and `parent` with character examples.

## Capabilities

### New Capabilities
- `piece-pivot`: Pivot point support for pieces — PivotGroup wrapping, offset calculation, rotation/scale around pivot instead of geometry center
- `piece-hierarchy`: Optional parent-child relationships between pieces — nesting PivotGroups, local transforms relative to parent, propagation of parent transforms to children

### Modified Capabilities
- `json-object-import`: Validation and construction now handles `pivot` and `parent` fields; `buildGroupFromDefinition` creates PivotGroup hierarchy instead of flat meshes
- `scene-persistence`: Serialization/deserialization of PivotGroup structures for both scene JSON and import-compatible JSON export
- `glb-export`: Animation clips recompiled over PivotGroup hierarchy; PivotGroups exported as part of the scene graph
- `object-selection`: Raycast hits mesh but gizmo attaches to parent PivotGroup; double-click behavior updated for hierarchy
- `properties-panel`: Displays PivotGroup position (pivot point) and allows editing; shows hierarchy context
- `transform-controls`: Gizmo operates on PivotGroup, not raw mesh, when piece has a pivot

## Impact

- **Core files**: `templates.js`, `persistence.js`, `json-import.js`, `selection.js`, `ui.js`, `export.js`
- **Animation system**: `animation.js` largely unchanged — `traverse` already finds PivotGroups by `userData.name`
- **JSON format**: New optional fields `pivot` and `parent` on pieces; no breaking changes for JSON without these fields
- **GLB output**: Hierarchy changes the node tree but animations bind correctly via node names
- **Editor UX**: Gizmo behavior changes for pivoted pieces; properties panel shows pivot position
- **LLM prompts**: `ask.md` and `ask-animation.md` updated with pivot/parent documentation and examples
