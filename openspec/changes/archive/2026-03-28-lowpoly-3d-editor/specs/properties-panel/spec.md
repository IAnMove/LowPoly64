## ADDED Requirements

### Requirement: Show properties panel on selection
The properties panel SHALL be visible only when an object is selected, and hidden otherwise.

#### Scenario: Panel shows on selection
- **WHEN** an object is selected
- **THEN** the right-side properties panel SHALL become visible

#### Scenario: Panel hides on deselection
- **WHEN** no object is selected
- **THEN** the properties panel SHALL be hidden

### Requirement: Editable name field
The properties panel SHALL display an editable name field bound to the selected object's userData.name.

#### Scenario: Edit object name
- **WHEN** the user types a new name in the name input
- **THEN** the object's userData.name SHALL update and the top-bar indicator SHALL reflect the change

### Requirement: Bidirectional position/rotation/scale fields
The properties panel SHALL display numeric inputs for position (X/Y/Z), rotation (X/Y/Z in degrees), and scale (X/Y/Z). Changes in the panel SHALL update the object, and gizmo transforms SHALL update the panel.

#### Scenario: Edit position via panel
- **WHEN** the user changes a position value in the panel
- **THEN** the selected object's position SHALL update in the 3D scene

#### Scenario: Gizmo transform updates panel
- **WHEN** the user drags the transform gizmo
- **THEN** the panel position/rotation/scale fields SHALL update in real-time

### Requirement: Color picker in panel
The properties panel SHALL include a color input that reflects and controls the selected object's material color.

#### Scenario: Color synced on selection
- **WHEN** an object is selected
- **THEN** the color picker SHALL show the object's current material color

### Requirement: Material type selector
The properties panel SHALL include a dropdown to change the selected object's material type.

#### Scenario: Change material from panel
- **WHEN** the user selects a different material type from the dropdown
- **THEN** the object's material SHALL be replaced preserving color, texture, and flat shading settings

### Requirement: Object action buttons
The properties panel SHALL include buttons for: duplicate (Ctrl+D), delete (Supr), and center camera on object.

#### Scenario: Duplicate from panel
- **WHEN** the user clicks the "DUPLICAR" button
- **THEN** a clone of the selected object SHALL be created at a slight offset and auto-selected

#### Scenario: Delete from panel
- **WHEN** the user clicks the "BORRAR" button
- **THEN** the selected object SHALL be removed from the scene and selection cleared

#### Scenario: Center camera from panel
- **WHEN** the user clicks "CENTRAR CAMARA EN OBJETO"
- **THEN** the OrbitControls target SHALL move to the selected object's world position
