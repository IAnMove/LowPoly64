## MODIFIED Requirements

### Requirement: Raycaster-based selection
The system SHALL use Three.js Raycaster to detect clicks on meshes within the `userObjects` group (recursive), selecting the intersected Mesh directly. Ctrl+Click SHALL add/remove objects from a multi-selection set. Double-click SHALL select the parent Group of the clicked mesh.

#### Scenario: User clicks on an object
- **WHEN** the user clicks on a mesh in the viewport (without Ctrl)
- **THEN** any multi-selection SHALL be cleared, that mesh SHALL become the sole selected object, TransformControls SHALL attach to it, and the properties panel SHALL show

#### Scenario: User clicks on empty space
- **WHEN** the user clicks on an area with no mesh
- **THEN** the current selection (single or multi) SHALL be cleared, TransformControls SHALL detach, and the properties panel SHALL hide

## ADDED Requirements

### Requirement: Multi-selection highlight
Each object in the multi-selection set SHALL be visually highlighted with the same emissive blue tint used for single selection.

#### Scenario: Multiple highlights
- **WHEN** 3 objects are in the multi-selection set
- **THEN** all 3 objects SHALL display the blue emissive highlight simultaneously

### Requirement: Selection count indicator
When multiple objects are selected, the top bar indicator SHALL show the count of selected objects instead of a single object name.

#### Scenario: Multi-selection indicator
- **WHEN** 3 objects are selected via Ctrl+Click
- **THEN** the selected-name indicator SHALL display "3 OBJETOS" (or similar count text)

### Requirement: Properties panel in multi-selection mode
When multiple objects are selected, the properties panel SHALL hide individual property fields and show only group actions (Agrupar button, color aplicar a todos).

#### Scenario: Multi-selection panel
- **WHEN** 2+ objects are Ctrl+Click selected
- **THEN** the properties panel SHALL show "AGRUPAR (Ctrl+G)" button and "APLICAR COLOR A TODOS" option, but hide position/rotation/scale/name fields
