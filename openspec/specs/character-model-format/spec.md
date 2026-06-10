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
