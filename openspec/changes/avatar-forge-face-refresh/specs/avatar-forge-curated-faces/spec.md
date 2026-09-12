## ADDED Requirements

### Requirement: Original composable face presets
Avatar Forge SHALL provide at least four original starter faces with distinct eyes, brows, mouth, head proportions and palettes. Their features SHALL remain individually selectable and editable using existing placement controls.

#### Scenario: Choose and customize a new face
- **WHEN** a user selects a new starter face and changes its eye color or mouth preset
- **THEN** the preview SHALL show the requested change while keeping the remaining recipe fields intact

### Requirement: Readable attachment across head shapes
Facial features SHALL follow the generated skull surface, and hair and accessories SHALL compose without unintended duplicated hair layers. Corrected defaults SHALL be checked on representative round, square, chibi and heroic heads.

#### Scenario: Inspect a face from the side
- **WHEN** a user rotates a default curated face from front to profile
- **THEN** its eyes, brows, nose, mouth, ears and hair SHALL remain attached to the appropriate head region

### Requirement: Preserve authored faces in interchange
Recipes, scene saves and GLB exports SHALL retain the new facial geometry, textures, colors and feature identities required to reproduce the face.

#### Scenario: Export and reload a new face
- **WHEN** a curated avatar is exported and imported again
- **THEN** its visible face SHALL retain its geometry and textured features

### Requirement: Visual evidence accompanies completion
The change SHALL include render evidence for old defaults before and after correction and for the new faces from multiple angles.

#### Scenario: Review the delivered collection
- **WHEN** the implementation is delivered
- **THEN** the user SHALL receive viewable examples generated with the actual application builder
