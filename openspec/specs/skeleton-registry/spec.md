## Purpose
Define skeleton data, runtime registration, and default skeleton resolution for CharacterModel assets.

## Requirements

### Requirement: Skeleton definition format
A skeleton definition SHALL provide:
- `id` (string, required)
- `archetype` (registered archetype id, required)
- `bones[]` with `name`, `parent`, and local `position`
- `defaultBindings` mapping slot ids to bone name arrays
- `animations[]` in the existing animation definition format when clips are available

#### Scenario: Load HUMANOID_DEFAULT skeleton
- **WHEN** `HUMANOID_DEFAULT` is loaded
- **THEN** it SHALL include the humanoid bone hierarchy and default bindings for head, torso, limbs, and weapon slots

### Requirement: Skeleton registry loads from the data directory
The system SHALL load skeleton definitions from `src/data/skeletons/` and expose a queryable runtime registry.

#### Scenario: List skeletons for archetype
- **WHEN** the registry is queried for skeletons with archetype `HUMANOID`
- **THEN** it SHALL return every registered humanoid skeleton

#### Scenario: Get skeleton by ID
- **WHEN** the registry is queried for `HUMANOID_DEFAULT`
- **THEN** it SHALL return the full skeleton definition

### Requirement: Default skeleton per archetype
Each archetype SHALL have at least one default skeleton, and CharacterModel imports without `skeletonId` SHALL resolve to that default.

#### Scenario: Resolve default skeleton for HUMANOID
- **WHEN** a CharacterModel uses archetype `HUMANOID` and omits `skeletonId`
- **THEN** the system SHALL assign `HUMANOID_DEFAULT`

### Requirement: Import standalone skeleton JSON
The system SHALL allow runtime import of a standalone skeleton JSON definition through the JSON import flow.

#### Scenario: Import skeleton from JSON text
- **WHEN** a user pastes a valid skeleton JSON into the import flow
- **THEN** the system SHALL register it and report success without requiring a rebuild

### Requirement: Import standalone animation definitions
The system SHALL allow animation definitions without a full model to be attached to a compatible skeleton or selected group.

#### Scenario: Import animation clip to selected group
- **WHEN** a user imports a JSON containing animation tracks while a compatible group is selected
- **THEN** the imported animation SHALL be added to the group's playable clips
