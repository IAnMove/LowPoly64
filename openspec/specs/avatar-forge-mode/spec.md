## Purpose
Define the requirements for building, reviewing, and confirming humanoid avatars inside `Avatar Forge` with curated presets and stable preview behavior.
## Requirements
### Requirement: Open Avatar Forge from the editor
The system SHALL provide an `Avatar Forge` mode inside the main editor UI for building a humanoid avatar from curated presets. The mode SHALL support both creating a new avatar and reopening an existing avatar-created group that has `userData.avatarRecipe`.

Blank sessions SHALL open in the canonical mold-based head workflow. Existing avatar-created groups SHALL reopen in the same head build mode that was saved in their recipe.

#### Scenario: Open a blank avatar session
- **WHEN** the user clicks `AVATAR FORGE` from the editor UI without an avatar selected
- **THEN** the system SHALL open the builder with a default humanoid recipe, `headBuildMode: mold`, `headMoldId: psx_mesh_portrait_01`, and a live preview

#### Scenario: Reopen an existing avatar-created group
- **WHEN** the user selects a group that contains `userData.avatarRecipe` and opens `Avatar Forge`
- **THEN** the builder SHALL preload that recipe, preserve its saved head build mode, and preview the current avatar for editing

### Requirement: Assemble avatars from curated humanoid-safe presets
The builder SHALL expose curated preset choices for body mold, head mold, hair, eyes, eyebrows, nose, mouth, ears, palette, and optional accessories in the primary mold-based workflow. For `mold` mode, each change SHALL update the preview while preserving a humanoid-compatible slot layout. The builder SHALL also retain the expanded style library for compatible `legacy` recipes, but SHALL NOT use that path as the default for new avatars.

#### Scenario: Change facial presets
- **WHEN** the user changes the eye, eyebrow, nose, mouth, or ear preset in mold mode inside `Avatar Forge`
- **THEN** the preview SHALL update the compiled head without changing the selected body mold

#### Scenario: Change body mold
- **WHEN** the user switches from one supported body mold to another
- **THEN** the preview SHALL rebuild using the new body proportions while staying in archetype `HUMANOID`

#### Scenario: Load defaults from the mold library
- **WHEN** the user opens a blank avatar session after the mold-based head system is installed
- **THEN** the builder SHALL populate readable default mold and feature presets instead of starting from an empty or broken face

#### Scenario: Reopen a legacy recipe
- **WHEN** the user opens an avatar recipe that was saved with the legacy full-face head pipeline
- **THEN** the builder SHALL keep that recipe editable without forcing the user into the new mold-based head flow

### Requirement: Confirm Avatar Forge output as a rig-ready humanoid
Confirming the builder SHALL create or update a scene group that remains compatible with the normal humanoid pipeline. The resulting group SHALL:

- use archetype `HUMANOID`
- keep a valid humanoid `slotMap`
- store `userData.avatarRecipe`
- assign animation profile `HUMANOID_AVATAR_BASE` unless explicitly overridden
- generate the head from either the canonical `mold` pipeline or the preserved `legacy` pipeline, depending on the saved recipe mode

#### Scenario: Insert a new avatar into the scene
- **WHEN** the user confirms a new avatar from `Avatar Forge`
- **THEN** the system SHALL add a humanoid group to the scene, select it, and leave it ready for the rig panel and GLB export

#### Scenario: Update an existing avatar
- **WHEN** the user edits an existing avatar-created group and confirms
- **THEN** the system SHALL replace that avatar group with the rebuilt result while preserving editability through `avatarRecipe`

### Requirement: Show a compact character sheet inside the builder
`Avatar Forge` SHALL show a compact ficha of the active selections so the user can understand the current character definition at a glance even as the catalog grows. The summary SHALL include the selected mold, head build mode, head mold or legacy head source, hair, eyes, eyebrows, nose, mouth, ears, accessory, palette, and any active placement or custom color overrides.

#### Scenario: Review current selections
- **WHEN** the user changes any body or face preset
- **THEN** the builder SHALL update a compact summary of the selected mold, head mode, facial presets, accessory choices, palette, and avatar label

#### Scenario: Review placement overrides
- **WHEN** the user customizes the size or position of a detached facial feature in mold mode
- **THEN** the builder SHALL reflect that override in the compact summary without hiding the active preset selections

### Requirement: Support repeatable visual review of expanded face presets
The builder SHALL provide a consistent preview workflow for auditing mold-based head features and legacy head recipes from the live app. When the user changes `head mold`, `hair`, `eyes`, `brows`, `nose`, `mouth`, `ears`, `accessory`, or any mold-mode placement control, the preview SHALL frame the head area in a centered, comparable view without deforming the final body result.

#### Scenario: Audit a face preset
- **WHEN** the user selects a head-related preset in `Avatar Forge`
- **THEN** the preview SHALL reframe the avatar to a centered head view suitable for direct comparison

#### Scenario: Audit a placement control
- **WHEN** the user changes a mold-mode placement control such as eye spacing or mouth height
- **THEN** the preview SHALL stay in centered head-review framing while applying the new control value

#### Scenario: Confirm after head review
- **WHEN** the user confirms the avatar after reviewing head-related presets or placement controls
- **THEN** the resulting scene group SHALL keep the intended body proportions and SHALL NOT inherit temporary preview deformation

### Requirement: Adjust detached feature placement in the builder
In mold mode, `Avatar Forge` SHALL expose placement controls for detached features so the user can personalize the face without leaving the builder.

#### Scenario: Adjust eye controls
- **WHEN** the user edits `size`, `up/down`, `left/right`, or `spacing` for eyes
- **THEN** the builder SHALL update the live preview and keep the selected eye preset active

#### Scenario: Adjust another detached feature
- **WHEN** the user edits `size`, `up/down`, or `left/right` for brows, nose, mouth, ears, or hair
- **THEN** the builder SHALL update the live preview and keep the selected preset active for that feature

