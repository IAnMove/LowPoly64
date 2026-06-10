## Purpose
Define the material system used by editor objects, including supported material types and how they are applied or updated.

## Requirements

### Requirement: Material types
The system SHALL support four material types: Basic (MeshBasicMaterial), Lambert (MeshLambertMaterial), Phong (MeshPhongMaterial), and Standard (MeshStandardMaterial).

#### Scenario: Change material type
- **WHEN** the user selects a different material type from the dropdown
- **THEN** the selected object's material SHALL be replaced with the chosen type, preserving color and texture settings

### Requirement: Flat shading toggle
The system SHALL provide a global flat shading toggle that applies flatShading to all materials for the low-poly look.

#### Scenario: Enable flat shading
- **WHEN** the user clicks the "FLAT SHADING" button
- **THEN** all existing and future materials SHALL have flatShading set to true and geometry normals SHALL be recomputed

#### Scenario: Disable flat shading
- **WHEN** the user clicks "FLAT SHADING" again
- **THEN** all materials SHALL have flatShading set to false

### Requirement: Wireframe toggle
The system SHALL provide a global wireframe toggle.

#### Scenario: Toggle wireframe on
- **WHEN** the user clicks "WIREFRAME"
- **THEN** all user object materials SHALL display in wireframe mode

#### Scenario: Toggle wireframe off
- **WHEN** the user clicks "WIREFRAME" again
- **THEN** all materials SHALL return to solid rendering

### Requirement: Color assignment
The system SHALL allow changing the base color of the selected object via a color picker or the retro palette.

#### Scenario: Change color via picker
- **WHEN** the user changes the color input value
- **THEN** the selected object's material color SHALL update immediately

#### Scenario: Quick color from palette
- **WHEN** the user clicks a color swatch in the retro palette
- **THEN** the selected object's material color SHALL change to that color

### Requirement: Retro color palette
The system SHALL display a predefined palette of retro N64-style colors for quick assignment.

#### Scenario: Palette displayed
- **WHEN** the viewport loads
- **THEN** a palette with at least 8 retro colors SHALL be visible in the viewport overlay

### Requirement: Random retro color
The system SHALL provide a "RANDOM RETRO" button that assigns a random color from the retro palette.

#### Scenario: Random color assigned
- **WHEN** the user clicks "RANDOM RETRO"
- **THEN** the selected object SHALL receive a random color from the predefined retro palette

