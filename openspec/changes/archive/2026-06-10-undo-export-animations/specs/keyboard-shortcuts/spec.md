## ADDED Requirements

### Requirement: Undo shortcut
The system SHALL trigger undo when the user presses Ctrl+Z (or Cmd+Z on Mac).

#### Scenario: Ctrl+Z undoes
- **WHEN** user presses Ctrl+Z
- **THEN** the last undoable action is reversed

### Requirement: Redo shortcut
The system SHALL trigger redo when the user presses Ctrl+Shift+Z (or Cmd+Shift+Z on Mac).

#### Scenario: Ctrl+Shift+Z redoes
- **WHEN** user presses Ctrl+Shift+Z
- **THEN** the last undone action is re-applied

### Requirement: Play/Pause animation shortcut
The system SHALL toggle animation play/pause when the user presses Space, but only when a selected object has animations.

#### Scenario: Space plays animation
- **WHEN** user selects an animated group and presses Space
- **THEN** the animation starts playing

#### Scenario: Space pauses animation
- **WHEN** an animation is playing and user presses Space
- **THEN** the animation pauses at the current frame

### Requirement: Shortcuts tooltip update
The shortcuts tooltip SHALL include the new shortcuts: Ctrl+Z (Deshacer), Ctrl+Shift+Z (Rehacer), Space (Play/Pausa animación).

#### Scenario: Updated tooltip
- **WHEN** user hovers over the help icon
- **THEN** the tooltip shows all shortcuts including the new ones
