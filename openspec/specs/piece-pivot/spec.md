## Purpose
Define how piece pivots are represented in object JSON and used to control rotation origins in the editor.

## Requirements

### Requirement: Pivot field in piece JSON
Each piece in the JSON definition MAY include an optional `pivot` field: an `[x, y, z]` array specifying the rotation/scale origin point in group space (or parent space if `parent` is set). When omitted, the pivot SHALL default to the piece's `position` value (preserving current behavior).

#### Scenario: Piece with pivot defined
- **WHEN** a piece JSON has `"position": [-1, 2.8, 0]` and `"pivot": [-1, 3.4, 0]`
- **THEN** the system SHALL create a PivotGroup at `[-1, 3.4, 0]` containing the mesh at local offset `[0, -0.6, 0]`

#### Scenario: Piece without pivot (backward compatible)
- **WHEN** a piece JSON has `"position": [-1, 2.8, 0]` and no `pivot` field
- **THEN** the system SHALL create a PivotGroup at `[-1, 2.8, 0]` with the mesh at local offset `[0, 0, 0]` (equivalent to current behavior)

### Requirement: PivotGroup internal structure
Each piece SHALL be represented internally as a `THREE.Group` (PivotGroup) containing the mesh as its only child. The PivotGroup SHALL have:
- `userData.name` set to the piece's name (for animation targeting)
- `userData.isPivot = true` (to distinguish from user-created Groups)
- `position` set to the pivot point
- `name` set to the piece's name (for Three.js track binding)

The child mesh SHALL have:
- `userData.geometryType` set to the geometry type
- `position` set to the offset from pivot (`piece.position - piece.pivot`)
- No `userData.name` on the mesh itself (the PivotGroup owns the name)

#### Scenario: PivotGroup marker
- **WHEN** a piece is built with a pivot
- **THEN** the PivotGroup SHALL have `userData.isPivot === true` and the child mesh SHALL NOT have `userData.isPivot`

#### Scenario: Animation targets PivotGroup
- **WHEN** an animation track targets `"BRAZO_IZQ"` and the piece `BRAZO_IZQ` has a pivot at the shoulder
- **THEN** `compileAnimation` traverse SHALL find the PivotGroup (not the mesh) by `userData.name`, and rotation SHALL orbit the mesh around the shoulder pivot

### Requirement: Rotation and scale use pivot origin
When an animation or gizmo applies rotation or scale to a piece with a pivot, the transform SHALL occur around the pivot point (the PivotGroup's position), not around the mesh geometry center.

#### Scenario: Arm rotation around shoulder
- **WHEN** a piece `BRAZO_IZQ` has pivot at `[-1, 3.4, 0]` (shoulder) and position at `[-1, 2.8, 0]` (arm center), and an animation applies `rotation.x = 0.4`
- **THEN** the arm mesh SHALL orbit around `[-1, 3.4, 0]`, swinging downward from the shoulder like a natural arm movement

#### Scenario: Scale from pivot
- **WHEN** a piece has a pivot and an animation applies `scale [1.5, 1.5, 1.5]`
- **THEN** the piece SHALL scale outward from the pivot point, not from the mesh center

