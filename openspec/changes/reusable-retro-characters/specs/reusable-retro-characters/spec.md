## ADDED Requirements

### Requirement: Simple PSX and N64 character creation
The app SHALL provide reusable PSX and N64 body presets, an interchangeable head, proportion/color controls and a live preview. Default complete characters MUST contain at most 1200 triangles.

#### Scenario: Create either style
- **WHEN** the user selects PSX or N64 and creates a character
- **THEN** a complete editable low-poly character appears with the chosen body and head and valid HUMANOID_STANDARD rig metadata and playable animations.

### Requirement: Reusable body and head attachment
The app SHALL create a headless body with a HEAD joint and SHALL attach a chosen head without regenerating its body.

#### Scenario: Reuse a manually adjusted body
- **WHEN** the user edits a body's arm or shirt and applies a different head
- **THEN** the body's edits and rig remain intact and the head follows its HEAD joint.

### Requirement: JSON interchange
The app SHALL import versioned character recipes, complete CharacterModel/object JSON and native GLB snapshot JSON. Exported geometry, hierarchy, root transform, recipe and animations MUST survive reimport.

#### Scenario: Reimport an exported character
- **WHEN** either style is exported to JSON and imported into a fresh scene
- **THEN** geometry, colors, proportions and rig motion match the source.

### Requirement: GLB interchange
The app SHALL import embedded GLB files and export characters with geometry, materials, hierarchy and animations. Imported GLB SHALL remain saveable and exportable as JSON and GLB.

#### Scenario: Exchange a rigged character
- **WHEN** a studio character is exported to GLB, imported, saved, reopened and exported again
- **THEN** its body and head remain visible and its rig animation moves the same parts.

### Requirement: Preserve manual edits
Scene saves SHALL preserve actual character geometry and child transforms in addition to generator metadata, while continuing to load legacy recipe-only avatars.

#### Scenario: Save a changed avatar
- **WHEN** the user changes the head scale and adds a child piece, then saves and reloads
- **THEN** both modifications remain present.

### Requirement: Clear import validation
The app SHALL reject unsupported recipe versions, malformed geometry and unsupported GLB resources with actionable errors and no partial scene mutation.

#### Scenario: Invalid file
- **WHEN** an invalid recipe or GLB is imported
- **THEN** the app explains the error and the current scene is unchanged.
