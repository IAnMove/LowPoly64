## Purpose
Define how piece hierarchies are expressed through parent relationships in object JSON and reconstructed in the editor.

## Requirements

### Requirement: Parent field in piece JSON
Each piece in the JSON definition MAY include an optional `parent` field: a string matching the `name` of another piece. When set, the piece's PivotGroup SHALL be added as a child of the parent piece's PivotGroup instead of the root Group. The piece's `position` and `pivot` SHALL be interpreted as local to the parent's pivot space.

#### Scenario: Piece with parent
- **WHEN** a piece `CABEZA` has `"parent": "TORSO"` and `"position": [0, 1.5, 0]`
- **THEN** the `CABEZA` PivotGroup SHALL be a child of the `TORSO` PivotGroup, positioned at `[0, 1.5, 0]` in TORSO's local space

#### Scenario: Piece without parent
- **WHEN** a piece has no `parent` field
- **THEN** its PivotGroup SHALL be added directly to the root Group (current behavior)

#### Scenario: Parent not found
- **WHEN** a piece references a `parent` name that does not match any other piece
- **THEN** the system SHALL log a warning and attach the piece to the root Group as fallback

### Requirement: Transform propagation through hierarchy
When a parent piece is moved, rotated, or scaled (by animation or gizmo), all child pieces SHALL inherit the transform automatically through Three.js scene graph propagation.

#### Scenario: Torso rotation moves arms
- **WHEN** `TORSO` is rotated by an animation and `BRAZO_IZQ` has `"parent": "TORSO"`
- **THEN** `BRAZO_IZQ` SHALL move and rotate along with `TORSO` as if physically attached

#### Scenario: Walk bounce propagates to head
- **WHEN** a walk animation adds a vertical bounce to `TORSO` via position track and `CABEZA` has `"parent": "TORSO"`
- **THEN** `CABEZA` SHALL bounce along with `TORSO` without needing its own position track

### Requirement: Two-pass build for parent resolution
The builder SHALL create all PivotGroups first (flat), then re-parent pieces that have a `parent` field in a second pass. This SHALL allow pieces to appear in any order in the JSON array.

#### Scenario: Child defined before parent in JSON
- **WHEN** the pieces array has `CABEZA` (with `parent: "TORSO"`) before `TORSO`
- **THEN** the system SHALL still correctly nest `CABEZA` under `TORSO` after the second pass

### Requirement: Hierarchy depth limit
The system SHALL support nesting up to 4 levels deep (root â†’ parent â†’ child â†’ grandchild). Deeper nesting SHALL be ignored with a console warning.

#### Scenario: Three levels of nesting
- **WHEN** pieces define `TORSO` â†’ `BRAZO_IZQ` (parent: TORSO) â†’ `MANO_IZQ` (parent: BRAZO_IZQ)
- **THEN** the scene graph SHALL be `RootGroup > TORSO PivotGroup > BRAZO_IZQ PivotGroup > MANO_IZQ PivotGroup`

