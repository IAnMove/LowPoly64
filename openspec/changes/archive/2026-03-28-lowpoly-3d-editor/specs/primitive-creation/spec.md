## ADDED Requirements

### Requirement: Add primitive geometries
The system SHALL allow adding the following primitive types: cube (BoxGeometry), sphere (SphereGeometry, 8x6 segments), cylinder (CylinderGeometry, 8 segments), cone (ConeGeometry, 8 segments), plane (PlaneGeometry), and capsule (CapsuleGeometry, 4x8 segments).

#### Scenario: User adds a cube
- **WHEN** the user clicks the "CUBO" button
- **THEN** a BoxGeometry(2,2,2) mesh SHALL appear at position (0,1,0) with the default material and SHALL be auto-selected

#### Scenario: User adds a low-poly sphere
- **WHEN** the user clicks the "ESFERA" button
- **THEN** a SphereGeometry(1.5, 8, 6) mesh SHALL appear, visibly low-poly with flat shading

#### Scenario: User adds each primitive type
- **WHEN** the user clicks any primitive button (cube, sphere, cylinder, cone, plane, capsule)
- **THEN** the corresponding geometry SHALL be created with low polygon counts, added to the userObjects group, and auto-selected

### Requirement: Default material assignment
Each new primitive SHALL receive the currently selected default material type (Lambert by default) with color #ffcc00 and flat shading enabled.

#### Scenario: New primitive has default material
- **WHEN** a primitive is added
- **THEN** it SHALL use MeshLambertMaterial with color #ffcc00 and flatShading: true

### Requirement: Primitives added to editable group
All user-created primitives SHALL be added to a `userObjects` Three.js Group to separate them from scene infrastructure (grid, lights, axes).

#### Scenario: Primitive is in userObjects
- **WHEN** a primitive is added
- **THEN** it SHALL be a child of the `userObjects` Group and accessible for selection and export
