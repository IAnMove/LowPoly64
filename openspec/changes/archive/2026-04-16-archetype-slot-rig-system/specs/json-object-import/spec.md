## MODIFIED Requirements

### Requirement: Import JSON object definition
The system SHALL allow importing 3D objects from a JSON definition that uses the format: `{ name, pieces: [{ geometry: { type, params }, color, name, position, rotation?, scale?, pivot?, parent? }] }`. Each piece MAY include optional `pivot` (rotation origin as `[x, y, z]`) and `parent` (name of another piece). The system SHALL build the object using PivotGroups and parent hierarchy when these fields are present.

Additionally, the system SHALL detect and accept the new `CharacterModel` format: `{ name, archetype, slots: [{ slotId, pieces }], animationProfile?, skeletonId? }`. When this format is detected, the system SHALL:
1. Validate the archetype and slots against the archetype registry.
2. Convert the CharacterModel to the internal `pieces[]` format.
3. Store archetype metadata in the group's `userData`.
4. Resolve and apply the skeleton and animation profile if specified.

#### Scenario: Import via paste
- **WHEN** the user opens the import modal and pastes a valid JSON definition and clicks "Importar"
- **THEN** the system SHALL parse the JSON, create a Group with PivotGroup-wrapped pieces (with hierarchy if `parent` is specified), add it to userObjects, and select the root group

#### Scenario: Import via file
- **WHEN** the user clicks "Importar JSON" and selects a .json file containing a valid object definition
- **THEN** the system SHALL read the file, parse it, and create the object in the scene with PivotGroups and hierarchy

#### Scenario: Import CharacterModel format
- **WHEN** the user pastes a JSON with `archetype` and `slots` fields
- **THEN** the system SHALL convert it to internal format, apply the skeleton/animation profile, and load the model with archetype metadata in userData

#### Scenario: Import old format still works
- **WHEN** the user pastes a JSON with `pieces[]` but no `archetype` field
- **THEN** the system SHALL import it using the existing flow without any changes

### Requirement: JSON validation on import
The system SHALL validate the JSON before building the object. It SHALL check that `pieces` is an array and each piece has `geometry.type` matching a supported type (cube, sphere, cylinder, cone, plane, capsule, torus). If `pivot` is present, it SHALL be an array of 3 numbers. If `parent` is present, it SHALL be a non-empty string.

For CharacterModel format, the system SHALL additionally validate:
- `archetype` is a registered archetype.
- Each slot's `slotId` is valid for the given archetype.
- Each piece in a slot has required fields: `template`, `name`, `size`, `offset`, `material`.

#### Scenario: Invalid pivot format
- **WHEN** a piece has `"pivot": "shoulder"` (not an array)
- **THEN** the system SHALL display an error message indicating the invalid pivot format

#### Scenario: Invalid parent format
- **WHEN** a piece has `"parent": 123` (not a string)
- **THEN** the system SHALL display an error message indicating the invalid parent format

#### Scenario: Valid pivot and parent
- **WHEN** a piece has `"pivot": [0, 3.4, 0]` and `"parent": "TORSO"`
- **THEN** the system SHALL accept the piece and build it with the specified pivot and parent

#### Scenario: Invalid archetype in CharacterModel
- **WHEN** a CharacterModel JSON has `archetype: "DRAGON"` which is not registered
- **THEN** the system SHALL display an error "Archetype not recognized: DRAGON"

#### Scenario: Invalid slot for archetype
- **WHEN** a CharacterModel with archetype "CAR" includes a slot with slotId "HEAD"
- **THEN** the system SHALL display an error indicating HEAD is not a valid slot for CAR

### Requirement: ask.md prompt file
The project SHALL include an `ask.md` file at the root with a ready-to-copy prompt for asking external LLMs to generate object JSON definitions. The prompt SHALL include the schema with `pivot` and `parent` fields documented, supported geometry types with their params, a complete character example with hierarchy and animations, and instructions to return only JSON.

The `ask.md` SHALL be updated to include the new `CharacterModel` format as the preferred format for character/vehicle models, with the old format documented as a legacy alternative.

#### Scenario: ask.md documents pivot and parent
- **WHEN** a user reads ask.md
- **THEN** they SHALL find documentation for the `pivot` field (what it does, format, when to use it) and the `parent` field (how it creates hierarchy, local transforms)

#### Scenario: ask.md documents CharacterModel format
- **WHEN** a user reads ask.md
- **THEN** they SHALL find the CharacterModel schema with archetype, slots, animationProfile, and at least one complete example
