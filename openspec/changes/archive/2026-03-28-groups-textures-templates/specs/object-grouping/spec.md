## ADDED Requirements

### Requirement: Multi-selection with Ctrl+Click
The system SHALL support selecting multiple objects by holding Ctrl while clicking. Each Ctrl+Click SHALL toggle the clicked object in/out of the current selection set.

#### Scenario: Add object to selection
- **WHEN** the user Ctrl+clicks on an unselected object
- **THEN** the object SHALL be added to the selection set and highlighted, without deselecting previously selected objects

#### Scenario: Remove object from selection
- **WHEN** the user Ctrl+clicks on an already-selected object
- **THEN** the object SHALL be removed from the selection set and its highlight removed

#### Scenario: Normal click clears multi-selection
- **WHEN** the user clicks (without Ctrl) on an object while multiple objects are selected
- **THEN** the multi-selection SHALL be cleared and only the clicked object SHALL be selected

### Requirement: Group selected objects
The system SHALL allow grouping multiple selected objects into a single Three.js Group via a button or Ctrl+G shortcut.

#### Scenario: Group via shortcut
- **WHEN** the user presses Ctrl+G with 2 or more objects selected
- **THEN** a new Group SHALL be created containing all selected objects, added to userObjects, and the Group SHALL become the active selection

#### Scenario: Group with single object
- **WHEN** the user presses Ctrl+G with only 1 or 0 objects selected
- **THEN** nothing SHALL happen

### Requirement: Ungroup objects
The system SHALL allow dissolving a Group back into individual objects via a button or Ctrl+Shift+G shortcut.

#### Scenario: Ungroup a group
- **WHEN** the user presses Ctrl+Shift+G while a Group (or an object inside a Group) is selected
- **THEN** all children of the Group SHALL be reparented to userObjects at their current world positions, the empty Group SHALL be removed, and the first child SHALL be selected

#### Scenario: Ungroup non-group
- **WHEN** the user tries to ungroup an object that is not in a user-created Group
- **THEN** nothing SHALL happen

### Requirement: Select entire group with double-click
The system SHALL allow selecting an entire Group by double-clicking on any of its children.

#### Scenario: Double-click selects group
- **WHEN** the user double-clicks on a mesh that is a child of a user Group
- **THEN** the entire Group SHALL be selected and TransformControls SHALL attach to the Group

#### Scenario: Single click selects individual piece
- **WHEN** the user single-clicks on a mesh that is a child of a Group
- **THEN** only that individual mesh SHALL be selected (existing behavior preserved)

### Requirement: Move/transform entire group
When a Group is selected (via double-click), TransformControls SHALL transform the entire Group, moving/rotating/scaling all children together.

#### Scenario: Transform group
- **WHEN** the user drags TransformControls while a Group is selected
- **THEN** all children of the Group SHALL move/rotate/scale together as a unit

### Requirement: Group/Ungroup UI buttons
The system SHALL display Group and Ungroup buttons in the properties panel when multiple objects or a group is selected.

#### Scenario: Group button visible
- **WHEN** 2 or more objects are selected
- **THEN** a "AGRUPAR" button SHALL be visible in the panel

#### Scenario: Ungroup button visible
- **WHEN** a Group or a child of a Group is selected
- **THEN** a "DESAGRUPAR" button SHALL be visible in the panel
