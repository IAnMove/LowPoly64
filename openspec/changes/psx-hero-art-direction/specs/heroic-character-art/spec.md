## ADDED Requirements

### Requirement: Reusable heroic geometry
The system SHALL build a shaped humanoid profile with independently controlled body proportions and retain the existing named rig and editable geometry.

#### Scenario: Body profile
- **WHEN** a heroic character is created
- **THEN** its torso, limbs and boots have deliberate profiles, its rig resolves and its body can be reused.

### Requirement: Expressive head and equipment
The system SHALL support a shaped head, directed asymmetric hair and fitted clothing/equipment for the PSX hero study.

#### Scenario: Silhouette and features
- **WHEN** the hero is viewed from front, profile and three quarters
- **THEN** the generated mesh exposes distinct facial planes, layered hair, shoulder armor and a broad sword rather than generic block substitutions.

### Requirement: Staged visual review and persistence
The system SHALL provide actual renderer captures for body, head, hair, equipment and presentation, and export the resulting editable character as JSON and GLB.

#### Scenario: Reopen
- **WHEN** the character is exported and reimported
- **THEN** its geometry, materials, rig and supported editing metadata remain usable.
