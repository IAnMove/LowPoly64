## 1. PivotGroup Builder (templates.js)

- [x] 1.1 Modify `buildGroupFromDefinition()`: for each piece, create a PivotGroup (`THREE.Group` with `userData.isPivot = true`, `userData.name = piece.name`, `name = piece.name`). Position PivotGroup at `piece.pivot ?? piece.position`. Create mesh as child with local offset `piece.position - pivot`. Set `userData.geometryType` on mesh only.
- [x] 1.2 Add second pass for `parent` resolution: after all PivotGroups are created flat, iterate pieces with `parent` field, find the parent PivotGroup by name, and re-parent the child PivotGroup. Log warning if parent not found.
- [x] 1.3 Add depth check: if nesting exceeds 4 levels, log warning and skip re-parenting.

## 2. JSON Validation (json-import.js)

- [x] 2.1 Update `validateObjectJSON()`: if `pivot` is present, validate it is an array of 3 numbers. If `parent` is present, validate it is a non-empty string.
- [x] 2.2 Ensure `importObjectFromJSON()` still selects the root group (not a child) after import.

## 3. Selection & Gizmo (selection.js)

- [x] 3.1 In `onMouseDown()` / `getMeshFromIntersect()`: after getting the hit mesh, check if `mesh.parent.userData.isPivot === true`. If so, return the parent PivotGroup as the selection target instead of the mesh.
- [x] 3.2 In `onDoubleClick()`: traverse up from PivotGroup past any `isPivot` parents to find the root Group (the one whose parent is `userObjects`). Select that root Group.
- [x] 3.3 Update `highlightMesh()` / `unhighlightMesh()`: when highlighting a PivotGroup, traverse its children to find the mesh and apply emissive highlight to it.

## 4. Properties Panel (ui.js)

- [x] 4.1 In `updatePropertiesPanel()`: when `state.selectedMesh` is a PivotGroup (`userData.isPivot`), read position/rotation/scale from the PivotGroup (not a child mesh). Display the name from `userData.name`.
- [x] 4.2 In `updatePosition()`, `updateRotation()`, `updateScale()`: apply changes to the selected object (which is now the PivotGroup when a pivoted piece is selected).
- [x] 4.3 In `updatePropertiesPanel()`: for color and material, read from the child mesh of the PivotGroup (traverse to find the first mesh child).
- [x] 4.4 In `updateColorFromPanel()`, `updateMaterialFromPanel()`: apply color/material changes to the child mesh of PivotGroups.

## 5. Scene Persistence (persistence.js)

- [x] 5.1 Update `serializeObject()`: recognize PivotGroups (`userData.isPivot`) and serialize as `type: "pivot"` with pivot position, child mesh data, and nested PivotGroup children.
- [x] 5.2 Update `deserializeObject()`: handle `type: "pivot"` by creating PivotGroup with correct position, flags, and child mesh. Recurse for nested PivotGroup children.
- [x] 5.3 Update `serializeGroupAsImportJSON()`: traverse PivotGroup hierarchy to reconstruct `pieces` array with `pivot`, `parent`, and `position` (visual position = pivotGroup.position + mesh.position). Handle nested PivotGroups by setting `parent` field.
- [x] 5.4 Update `serializeMeshAsPiece()` or create `serializePivotAsPiece()`: extract geometry/color from child mesh, compute visual position and pivot from PivotGroup structure.

## 6. GLB Export (export.js)

- [x] 6.1 In `prepareForExport()`: set `child.name` from `userData.name` for PivotGroups (not just meshes) to ensure animation track binding in glTF. Avoid setting conflicting names on child meshes of PivotGroups.
- [x] 6.2 Verify animation clips recompile correctly over the cloned PivotGroup hierarchy — `compileAnimation` traverse should find PivotGroups by `userData.name` in the cloned tree.
- [x] 6.3 Test: export a character with pivoted pieces and animations, open in Blender, verify rotations occur around pivot points.

## 7. Animation System Verification (animation.js)

- [x] 7.1 Verify `compileAnimation()` traverse finds PivotGroups by `userData.name` (should work already since PivotGroups have `userData.name` set). No code change expected.
- [x] 7.2 Verify `playAnimation()` works with PivotGroup-based groups — AnimationMixer targets nodes by name, which matches PivotGroup names.
- [x] 7.3 Test rotation, position, scale, and visible animations on pivoted pieces to confirm correct behavior.

## 8. Actions & Undo (actions.js)

- [x] 8.1 Update `duplicateSelected()`: when duplicating a PivotGroup, ensure the clone preserves `userData.isPivot` and the child mesh structure.
- [x] 8.2 Update `deleteSelected()`: when deleting a PivotGroup, remove it from its parent (which may be another PivotGroup, not just the root group).
- [x] 8.3 Verify `groupSelected()` / `ungroupSelected()` handle PivotGroups correctly — grouping PivotGroups should work, ungrouping should not break PivotGroup internal structure.

## 9. LLM Prompts (ask.md, ask-animation.md)

- [x] 9.1 Update `ask.md`: document `pivot` field with clear explanation (rotation origin point), when to use it (limbs, head), and format (`[x, y, z]`). Document `parent` field with explanation (hierarchy, local transforms).
- [x] 9.2 Add a complete character example in `ask.md` with pivot and parent: TORSO as root, CABEZA/BRAZO_IZQ/BRAZO_DER/PIERNA_IZQ/PIERNA_DER with parents and pivots at joints (shoulder, hip, neck).
- [x] 9.3 Include walk + idle animations in the example that demonstrate pivot-based rotation (arm swing from shoulder, leg swing from hip).
- [x] 9.4 Update `ask-animation.md` if needed to reflect that targets now rotate around pivot points.

## 10. Integration Testing

- [x] 10.1 Test import → play animation → verify visual pivot rotation for a character with walk animation
- [x] 10.2 Test import → export JSON (COPIAR JSON) → re-import → verify roundtrip fidelity (same hierarchy, positions, pivots)
- [x] 10.3 Test import → export GLB → open in Blender → verify animations play correctly with pivot rotations
- [x] 10.4 Test backward compatibility: import a JSON without pivot/parent fields → verify it works identically to before
- [x] 10.5 Test animation mode: enter animation mode with pivoted character, play clips, verify animations look correct
- [x] 10.6 Test scene persistence: save scene with pivoted objects → load → verify structure and animations intact
