## ADDED Requirements

### Requirement: Raycaster-based selection
The system SHALL use Three.js Raycaster to detect clicks on meshes within the `userObjects` group (recursive), selecting the intersected Mesh directly.

#### Scenario: User clicks on an object
- **WHEN** the user clicks on a mesh in the viewport
- **THEN** that mesh SHALL become selected, TransformControls SHALL attach to it, and the properties panel SHALL show

#### Scenario: User clicks on empty space
- **WHEN** the user clicks on an area with no mesh
- **THEN** the current selection SHALL be cleared, TransformControls SHALL detach, and the properties panel SHALL hide

### Requirement: Visual selection highlight
The selected mesh SHALL be visually highlighted by setting its material emissive color to a blue tint (0x4488ff) with intensity 0.4.

#### Scenario: Object highlight on selection
- **WHEN** a mesh is selected
- **THEN** its material emissive SHALL change to 0x4488ff with intensity 0.4

#### Scenario: Object highlight removed on deselection
- **WHEN** a mesh is deselected
- **THEN** its material emissive SHALL revert to its original value

### Requirement: Selection indicator in UI
The selected object's name SHALL be displayed in the top bar indicator.

#### Scenario: Name shown when selected
- **WHEN** a mesh is selected
- **THEN** the selected-name indicator SHALL display the mesh's userData.name

#### Scenario: No selection indicator
- **WHEN** no mesh is selected
- **THEN** the indicator SHALL display "NINGUN OBJETO"

### Requirement: Ignore TransformControls drag for selection
The system SHALL NOT trigger selection when the user is dragging TransformControls.

#### Scenario: Dragging gizmo does not reselect
- **WHEN** the user is dragging a TransformControls gizmo
- **THEN** mouse events SHALL NOT trigger a new raycaster selection
