## ADDED Requirements

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
