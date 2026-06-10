## ADDED Requirements

### Requirement: Open Avatar Forge from the editor
The system SHALL provide an `Avatar Forge` mode inside the main editor UI for building a humanoid avatar from curated presets. The mode SHALL support both creating a new avatar and reopening an existing avatar-created group that has `userData.avatarRecipe`.

#### Scenario: Open a blank avatar session
- **WHEN** the user clicks `AVATAR FORGE` from the editor UI without an avatar selected
- **THEN** the system SHALL open the builder with a default humanoid recipe and a live preview

#### Scenario: Reopen an existing avatar-created group
- **WHEN** the user selects a group that contains `userData.avatarRecipe` and opens `Avatar Forge`
- **THEN** the builder SHALL preload that recipe and preview the current avatar for editing

### Requirement: Assemble avatars from curated humanoid-safe presets
The builder SHALL expose curated preset choices for body mold, head shape, hair, eyes, eyebrows, mouth, palette, and optional accessories. Each change SHALL update the preview while preserving a humanoid-compatible slot layout.

#### Scenario: Change facial presets
- **WHEN** the user changes the eye or eyebrow preset in `Avatar Forge`
- **THEN** the preview SHALL update the compiled head without changing the selected body mold

#### Scenario: Change body mold
- **WHEN** the user switches from one supported body mold to another
- **THEN** the preview SHALL rebuild using the new body proportions while staying in archetype `HUMANOID`

### Requirement: Confirm Avatar Forge output as a rig-ready humanoid
Confirming the builder SHALL create or update a scene group that remains compatible with the normal humanoid pipeline. The resulting group SHALL:

- use archetype `HUMANOID`
- keep a valid humanoid `slotMap`
- store `userData.avatarRecipe`
- assign animation profile `HUMANOID_AVATAR_BASE` unless explicitly overridden
- generate the head from a compiled SVG source that fits the `HEAD` slot

#### Scenario: Insert a new avatar into the scene
- **WHEN** the user confirms a new avatar from `Avatar Forge`
- **THEN** the system SHALL add a humanoid group to the scene, select it, and leave it ready for the rig panel and GLB export

#### Scenario: Update an existing avatar
- **WHEN** the user edits an existing avatar-created group and confirms
- **THEN** the system SHALL replace that avatar group with the rebuilt result while preserving editability through `avatarRecipe`

### Requirement: Show a compact character sheet inside the builder
`Avatar Forge` SHALL show a compact ficha of the active selections so the user can understand the current character definition at a glance.

#### Scenario: Review current selections
- **WHEN** the user changes any body or face preset
- **THEN** the builder SHALL update a compact summary of the selected mold, facial presets, accessory choices, palette, and avatar label
