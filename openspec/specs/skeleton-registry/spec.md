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

### Requirement: Standard humanoid skeleton is available
The system SHALL include a `HUMANOID_STANDARD` skeleton that uses the standard Fast Poser/Animateur humanoid bone contract.

#### Scenario: Load standard humanoid skeleton
- **WHEN** the skeleton registry is queried for `HUMANOID_STANDARD`
- **THEN** it SHALL return a humanoid skeleton with standard bones including `Hips`, `Spine`, `Neck`, `Head`, `Left_Shoulder`, `Left_Upper_Arm`, `Left_Lower_Arm`, `Left_Hand`, `Right_Shoulder`, `Right_Upper_Arm`, `Right_Lower_Arm`, `Right_Hand`, `Left_Upper_Leg`, `Left_Lower_Leg`, `Left_Foot`, `Right_Upper_Leg`, `Right_Lower_Leg`, and `Right_Foot`

#### Scenario: Standard skeleton has humanoid bindings
- **WHEN** `HUMANOID_STANDARD` is loaded
- **THEN** its default bindings SHALL map humanoid slots for head, torso, arms, legs, and weapon hands to standard bone names

### Requirement: Humanoid skeleton aliases bridge standard and legacy names
The system SHALL provide a single alias/canonical-name layer that maps standard humanoid bone names to legacy editor and capture bone names.

#### Scenario: Resolve standard bone to legacy template node
- **WHEN** an animation references `Left_Upper_Arm` and the selected template exposes `ARM_L_UPPER` or `LEFT_ARM_UPPER`
- **THEN** the animation target resolver SHALL map the standard bone to the compatible legacy node

#### Scenario: Resolve legacy bone to standard template node
- **WHEN** an animation references `ARM_R_UPPER` and the selected template exposes `Right_Upper_Arm`
- **THEN** the animation target resolver SHALL map the legacy bone to the compatible standard node

### Requirement: Legacy humanoid skeletons remain loadable during migration
The system SHALL keep `HUMANOID_DEFAULT` and `HUMANOID_CAPTURE` loadable while standard skeleton adoption is in progress.

#### Scenario: Load legacy default skeleton
- **WHEN** the skeleton registry is queried for `HUMANOID_DEFAULT`
- **THEN** it SHALL continue returning the legacy humanoid skeleton

#### Scenario: Load capture compatibility skeleton
- **WHEN** a saved capture-generated model references `HUMANOID_CAPTURE`
- **THEN** the system SHALL load the capture skeleton or compatibility adapter instead of rejecting the model

