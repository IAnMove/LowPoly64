# undo-system Specification

## Purpose
TBD - created by archiving change undo-export-animations. Update Purpose after archive.
## Requirements
### Requirement: Undo stack with command pattern
The system SHALL maintain an undo stack of up to 50 actions. Each action SHALL store `undo()` and `redo()` functions that reverse/replay the operation. When the stack exceeds 50 entries, the oldest action SHALL be discarded and its resources disposed.

#### Scenario: Stack overflow
- **WHEN** the undo stack has 50 actions and a new action is pushed
- **THEN** the oldest action is removed and the new action is added at the top

### Requirement: Undo reverses the last action
The system SHALL reverse the most recent action when the user triggers undo. The undone action SHALL be moved to the redo stack.

#### Scenario: Undo a delete
- **WHEN** user deletes an object and presses Ctrl+Z
- **THEN** the deleted object is restored to the scene at its original position, rotation, scale, and material

#### Scenario: Undo a move
- **WHEN** user moves an object with TransformControls and presses Ctrl+Z
- **THEN** the object returns to its position before the drag started

### Requirement: Redo re-applies an undone action
The system SHALL re-apply the most recently undone action when the user triggers redo. A new user action SHALL clear the redo stack.

#### Scenario: Redo after undo
- **WHEN** user undoes a color change and presses Ctrl+Shift+Z
- **THEN** the color change is re-applied

#### Scenario: New action clears redo
- **WHEN** user undoes an action and then creates a new primitive
- **THEN** the redo stack is cleared

### Requirement: Undoable operations
The system SHALL register undo actions for: create primitive/template/import, delete object(s), transform (move/rotate/scale on TransformControls release), change color, change material type, group, ungroup, apply texture, and remove texture.

#### Scenario: Create then undo
- **WHEN** user adds a cube primitive and presses Ctrl+Z
- **THEN** the cube is removed from the scene

#### Scenario: Group then undo
- **WHEN** user groups 3 objects and presses Ctrl+Z
- **THEN** the group is dissolved and the 3 objects return to their original parent and transforms

### Requirement: Non-undoable operations
Camera changes, wireframe/flat-shading toggles, snap toggle, and save/load operations SHALL NOT be registered in the undo stack.

#### Scenario: Camera orbit does not register
- **WHEN** user orbits the camera and presses Ctrl+Z
- **THEN** the last undoable action (not the camera change) is undone

### Requirement: Transform undo captures drag boundaries
The system SHALL capture the object's transform when a TransformControls drag begins and register the undo action when the drag ends, storing before/after transforms as a single action.

#### Scenario: Drag and undo
- **WHEN** user drags an object through multiple positions and releases
- **THEN** pressing Ctrl+Z restores the position from before the drag started (not intermediate positions)

