## ADDED Requirements

### Requirement: Procedural template generation
The system SHALL provide procedural templates built entirely from Three.js primitives, requiring no external model files. Templates: chair, table, character, crate, barrel.

#### Scenario: Add chair template
- **WHEN** the user clicks the "Silla basica" button
- **THEN** a Group containing a seat (box), backrest (box), and 4 legs (cylinders) SHALL be created at the origin and added to userObjects

#### Scenario: Add table template
- **WHEN** the user clicks the "Mesa basica" button
- **THEN** a Group containing a tabletop (box) and 4 legs (cylinders) SHALL be created

#### Scenario: Add character template
- **WHEN** the user clicks the "Personaje placeholder" button
- **THEN** a Group containing head (sphere), torso (box), 2 arms (cylinders), and 2 legs (cylinders) SHALL be created with different colors per body part

#### Scenario: Add crate template
- **WHEN** the user clicks the "Caja decorativa" button
- **THEN** a decorated box mesh SHALL be created (box with distinct color/detail)

#### Scenario: Add barrel template
- **WHEN** the user clicks the "Barril low-poly" button
- **THEN** a Group with a barrel body (cylinder, low segments) and ring details (torus or cylinder rings) SHALL be created

### Requirement: Template pieces are individually editable
Each piece within a template Group SHALL be independently selectable and editable (position, rotation, scale, color, material).

#### Scenario: Select individual template piece
- **WHEN** the user clicks on a leg of a chair template
- **THEN** only that leg mesh SHALL be selected, not the entire chair Group

### Requirement: Templates use default material settings
Template pieces SHALL use the current default material type and flat shading setting, with per-piece colors for visual distinction.

#### Scenario: Template respects current material
- **WHEN** a template is added while Lambert material is selected
- **THEN** all template pieces SHALL use MeshLambertMaterial with flat shading enabled
