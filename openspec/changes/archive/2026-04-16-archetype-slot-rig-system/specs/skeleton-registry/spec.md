## ADDED Requirements

### Requirement: Skeleton definition format
A skeleton definition SHALL be a JSON object with:
- `id` (string, required): Unique identifier (e.g., "HUMANOID_DEFAULT", "CAR_SIMPLE").
- `archetype` (Archetype, required): Which archetype this skeleton is for.
- `bones` (Bone[], required): Hierarchical bone list where each bone has:
  - `name` (string): Unique bone name.
  - `parent` (string|null): Parent bone name (null for root).
  - `position` ([x,y,z]): Default position relative to parent.
- `defaultBindings` (object, required): Map of SlotId → string[] (bone names that the slot is bound to by default).
- `animations` (AnimationDef[], optional): Array of animation definitions in the existing format (name, duration, loop, tracks[]).

#### Scenario: Load HUMANOID_DEFAULT skeleton
- **WHEN** the skeleton "HUMANOID_DEFAULT" is loaded
- **THEN** it SHALL contain bones for a humanoid hierarchy (ROOT, SPINE, HEAD, ARM_L_UPPER, ARM_L_LOWER, HAND_L, ARM_R_UPPER, ARM_R_LOWER, HAND_R, LEG_L_UPPER, LEG_L_LOWER, FOOT_L, LEG_R_UPPER, LEG_R_LOWER, FOOT_R) and defaultBindings mapping HEAD→[HEAD], TORSO→[SPINE], ARM_L→[ARM_L_UPPER, ARM_L_LOWER, HAND_L], etc.

### Requirement: Skeleton registry loads from data directory
The system SHALL load skeleton definitions from `src/data/skeletons/` using `import.meta.glob`, similar to template loading. All valid skeleton files SHALL be available in a queryable registry.

#### Scenario: List skeletons for archetype
- **WHEN** the registry is queried for skeletons with archetype "HUMANOID"
- **THEN** it SHALL return all skeleton definitions that have `archetype: "HUMANOID"` (e.g., HUMANOID_DEFAULT, HUMANOID_CHIBI)

#### Scenario: Get skeleton by ID
- **WHEN** the registry is queried for skeleton "HUMANOID_DEFAULT"
- **THEN** it SHALL return the full skeleton definition including bones, defaultBindings, and animations

### Requirement: Default skeleton per archetype
Each archetype SHALL have at least one default skeleton. When a CharacterModel does not specify `skeletonId`, the system SHALL use the first skeleton registered for that archetype.

#### Scenario: Resolve default skeleton for HUMANOID
- **WHEN** a CharacterModel has archetype "HUMANOID" and no skeletonId
- **THEN** the system SHALL assign "HUMANOID_DEFAULT" as the skeleton

#### Scenario: Resolve default skeleton for CAR
- **WHEN** a CharacterModel has archetype "CAR" and no skeletonId
- **THEN** the system SHALL assign "CAR_SIMPLE" as the skeleton

### Requirement: Import standalone skeleton JSON
The system SHALL allow importing a skeleton definition JSON from the import modal or file upload, adding it to the runtime registry without requiring a file in `src/data/skeletons/`.

#### Scenario: Import skeleton from JSON text
- **WHEN** a user pastes a valid skeleton JSON (with `id`, `archetype`, `bones`, `defaultBindings`) into the import modal
- **THEN** the system SHALL add it to the skeleton registry and show a success toast

### Requirement: Import standalone animations
The system SHALL allow importing animation definitions (without a full model or skeleton) and attaching them to an existing skeleton in the registry or to the currently selected group.

#### Scenario: Import animation clip to selected group
- **WHEN** a user imports a JSON with `tracks` and a group with skeleton binding is selected
- **THEN** the animation SHALL be added to the group's animation clips and be playable
