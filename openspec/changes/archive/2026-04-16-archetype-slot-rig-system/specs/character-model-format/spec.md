## ADDED Requirements

### Requirement: CharacterModel data structure
The system SHALL support a `CharacterModel` data structure with the following fields:
- `name` (string, required): Display name of the model.
- `archetype` (Archetype, required): One of the registered archetype identifiers.
- `slots` (Slot[], required): Array of slot definitions, each containing:
  - `slotId` (SlotId, required): Identifier from the archetype's available slots.
  - `pieces` (Piece[], required): Array of geometric pieces, each with:
    - `template` (string, required): Geometry type (maps to existing types: CUBE→cube, PRISM→wedge, PLANE→plane, CYLINDER→cylinder, etc.)
    - `name` (string, required): Unique piece name within the model.
    - `size` ([x,y,z], required): Dimensions mapped to geometry params.
    - `offset` ([x,y,z], required): Local position relative to the character origin.
    - `rotation` ([x,y,z], optional): Euler rotation in radians.
    - `scale` ([x,y,z], optional): Scale factors.
    - `material` (string, required): Material identifier (color hex or material name).
    - `parent` (string, optional): Name of parent piece for hierarchy.
    - `pivot` ([x,y,z], optional): Pivot point for the piece.
- `animationProfile` (string, optional): Identifier referencing a predefined animation profile.
- `skeletonId` (string, optional): Override skeleton identifier; defaults to archetype's default skeleton.
- `style` (object, optional): Numeric parameters for animation intensity adjustments.

#### Scenario: Valid CharacterModel with all required fields
- **WHEN** a JSON object has `name`, `archetype` "HUMANOID", `slots` with valid pieces, and `animationProfile` "HUMANOID_SWORDSMAN"
- **THEN** the system SHALL accept it as a valid CharacterModel

#### Scenario: CharacterModel without optional fields
- **WHEN** a JSON object has `name`, `archetype`, and `slots` but no `animationProfile`, `skeletonId`, or `style`
- **THEN** the system SHALL accept it as valid, using defaults for the missing optional fields

### Requirement: CharacterModel converts to internal pieces format
The system SHALL convert a `CharacterModel` to the existing internal `pieces[]` format used by `buildGroupFromDefinition`. Each slot's pieces SHALL be flattened into a single `pieces[]` array. The `template` and `size` fields SHALL be mapped to the existing `geometry` format (type + params).

#### Scenario: Convert HUMANOID model to pieces
- **WHEN** a CharacterModel with archetype "HUMANOID" and slots HEAD (1 piece), TORSO (1 piece), ARM_L (2 pieces) is converted
- **THEN** the resulting pieces array SHALL contain 4 pieces with correct geometry types, positions, and parent references

#### Scenario: Template type mapping
- **WHEN** a piece has `template: "CUBE"` and `size: [2, 3, 1]`
- **THEN** it SHALL be converted to `geometry: { type: "cube", params: { width: 2, height: 3, depth: 1 } }`

#### Scenario: Template type PRISM maps to wedge
- **WHEN** a piece has `template: "PRISM"`
- **THEN** it SHALL be converted to `geometry: { type: "wedge", ... }`

### Requirement: CharacterModel metadata stored in group userData
When a CharacterModel is loaded, the resulting Three.js group SHALL store the following in `userData`:
- `archetype`: The archetype identifier.
- `slotMap`: A map of slotId → piece names belonging to that slot.
- `animationProfile`: The animation profile identifier (if provided).
- `skeletonId`: The skeleton identifier (resolved or default).
- `slotBindings`: A map of slotId → bone names (from skeleton default or user override).

#### Scenario: Access archetype from loaded model
- **WHEN** a CharacterModel with archetype "BIRD" is loaded and the resulting group is inspected
- **THEN** `group.userData.archetype` SHALL equal "BIRD"

### Requirement: Serialize group back to CharacterModel format
The system SHALL provide a function to serialize a Three.js group with CharacterModel metadata back to the `CharacterModel` JSON format, preserving archetype, slots, and profile information.

#### Scenario: Round-trip CharacterModel
- **WHEN** a CharacterModel JSON is loaded and then serialized back
- **THEN** the output JSON SHALL have the same `archetype`, `slots` (with pieces), and `animationProfile` as the original
