## Purpose
Define the CharacterModel format, its conversion rules, and the metadata stored on imported groups.
## Requirements
### Requirement: CharacterModel data structure
The system SHALL support a `CharacterModel` data structure with:
- `name` (string, required)
- `archetype` (registered archetype id, required)
- `slots` (required array of slot definitions)
- `animationProfile` (string, optional)
- `skeletonId` (string, optional)
- `style` (object, optional)

Each slot SHALL include `slotId` and `pieces[]`. Each slot piece SHALL include `template`, `name`, `size`, `offset`, and `material`, with optional `rotation`, `scale`, `parent`, and `pivot`.

#### Scenario: Valid CharacterModel with required fields
- **WHEN** a JSON object contains `name`, `archetype`, valid `slots`, and `animationProfile`
- **THEN** the system SHALL accept it as a valid CharacterModel

#### Scenario: CharacterModel without optional fields
- **WHEN** a CharacterModel omits `animationProfile`, `skeletonId`, and `style`
- **THEN** the system SHALL still accept it and resolve defaults where available

### Requirement: CharacterModel converts to internal pieces format
The system SHALL convert CharacterModel data to the existing internal `pieces[]` format used by group construction. Template and size data SHALL be mapped onto the existing geometry schema.

#### Scenario: Convert HUMANOID model to pieces
- **WHEN** a CharacterModel with several populated slots is converted
- **THEN** the resulting `pieces[]` array SHALL contain all slot pieces with the correct geometry, transforms, and parent references

#### Scenario: Template type mapping
- **WHEN** a slot piece uses `template: "CUBE"` and `size: [2, 3, 1]`
- **THEN** it SHALL map to `geometry.type: "cube"` with matching dimensions

### Requirement: CharacterModel metadata stored in group userData
When a CharacterModel is loaded, the resulting group SHALL store `archetype`, `slotMap`, `animationProfile`, `skeletonId`, and `slotBindings` in `userData`.

#### Scenario: Access archetype from loaded model
- **WHEN** a CharacterModel with archetype `BIRD` is loaded
- **THEN** `group.userData.archetype` SHALL equal `BIRD`

### Requirement: Serialize group back to CharacterModel format
The system SHALL support serializing a group with CharacterModel metadata back into CharacterModel JSON.

#### Scenario: Round-trip CharacterModel
- **WHEN** a CharacterModel is loaded and later exported in CharacterModel format
- **THEN** the result SHALL preserve archetype, slots, and animation profile data

### Requirement: Humanoid models can declare the standard skeleton
The CharacterModel format SHALL allow humanoid models to declare `skeletonId: "HUMANOID_STANDARD"` and preserve that skeleton identity through import and export.

#### Scenario: Import standard humanoid CharacterModel
- **WHEN** a CharacterModel declares archetype `HUMANOID` and `skeletonId: "HUMANOID_STANDARD"`
- **THEN** the imported group SHALL store `HUMANOID_STANDARD` in `group.userData.skeletonId`

#### Scenario: Export standard humanoid CharacterModel
- **WHEN** a group using `HUMANOID_STANDARD` is serialized back to CharacterModel JSON
- **THEN** the exported JSON SHALL preserve `skeletonId: "HUMANOID_STANDARD"` and its slot bindings

### Requirement: Humanoid model metadata supports standard and legacy animation compatibility
Humanoid CharacterModel metadata SHALL preserve enough slot and binding information for standard animations to target legacy models and legacy animations to target standard models.

#### Scenario: Legacy template accepts standard animation
- **WHEN** a legacy humanoid template uses legacy node names and receives a standard humanoid animation
- **THEN** its `slotMap` and `slotBindings` SHALL allow the resolver to build animation tracks for compatible nodes

#### Scenario: Standard template accepts legacy animation
- **WHEN** a standard humanoid template uses standard node names and receives a legacy humanoid animation
- **THEN** its metadata SHALL allow the resolver to build animation tracks for compatible standard nodes

### Requirement: Generated capture models serialize with reusable animation metadata
Video-generated humanoid models SHALL serialize the source skeleton, standard-compatible animation metadata, and generated rig metadata needed for future imports.

#### Scenario: Serialize skinned capture model
- **WHEN** a skinned capture-generated humanoid is exported
- **THEN** the serialized data SHALL include its capture rig metadata, source skeleton data, and imported animations

#### Scenario: Re-import skinned capture model
- **WHEN** a serialized skinned capture-generated humanoid is imported later
- **THEN** the model SHALL restore as an animatable humanoid with playable captured animations

