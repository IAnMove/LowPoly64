## ADDED Requirements

### Requirement: Validated source animation profile
The app SHALL inspect a GLB's skin, joint hierarchy, bind transforms and clips before transferring animations.

#### Scenario: Recognized Meshy profile
- **WHEN** the supplied 24-joint profile is loaded
- **THEN** the app identifies its moving clips and preserves its actual spine order and quaternion rotations.

#### Scenario: Unsupported source
- **WHEN** required joints, hierarchy or supported animation data are missing
- **THEN** the app reports the incompatibility without adding a partial character.

### Requirement: Compatible skinned retro copy
The app SHALL create a separate skinned character from an editable retro body while preserving the source model.

#### Scenario: Transfer onto either retro style
- **WHEN** a PSX or N64 character and a valid source GLB are supplied
- **THEN** the resulting character has normalized vertex weights, fitted joint positions, retained flat colors and moving native clips, and the original character remains editable.

#### Scenario: Different proportions
- **WHEN** target height or width differs from the source
- **THEN** the adapter keeps target bone lengths fixed and scales bind-relative hip motion rather than copying source joint translations.

### Requirement: Reversible workflow and interchange
The app SHALL expose creation through a GLB file action and preserve skin, skeleton and clips in JSON, scene persistence and GLB export.

#### Scenario: Save and restore compatible character
- **WHEN** an animated copy is exported and imported as JSON or GLB, or saved and loaded as a scene
- **THEN** its skeleton and vertex deformation remain functional.

#### Scenario: Undo creation
- **WHEN** creation is undone and redone
- **THEN** only the animated copy is removed and restored.
