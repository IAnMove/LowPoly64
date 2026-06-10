## Purpose
Define keyboard shortcuts and shortcut help UI for transform, grouping, and related editor actions.
## Requirements
### Requirement: Transform mode shortcuts
The system SHALL support keyboard shortcuts W (translate), E (rotate), R (scale) to switch TransformControls mode. These shortcuts SHALL be displayed in a tooltip overlay in the viewport, not in the top bar.

#### Scenario: Press W for translate
- **WHEN** the user presses the W key and no text input is focused
- **THEN** TransformControls SHALL switch to "translate" mode

#### Scenario: Press E for rotate
- **WHEN** the user presses the E key and no text input is focused
- **THEN** TransformControls SHALL switch to "rotate" mode

#### Scenario: Press R for scale
- **WHEN** the user presses the R key and no text input is focused
- **THEN** TransformControls SHALL switch to "scale" mode

### Requirement: Keyboard shortcut tooltip
The system SHALL display a help icon in the viewport. When the user hovers over this icon, a tooltip SHALL appear centered in the viewport showing all keyboard shortcuts in a readable, formatted layout.

#### Scenario: Hover shows shortcuts
- **WHEN** the user hovers over the keyboard help icon in the viewport
- **THEN** a centered overlay panel SHALL appear listing all shortcuts: W (Mover), E (Rotar), R (Escalar), Supr (Borrar), Ctrl+D (Duplicar), Ctrl+G (Agrupar), Ctrl+Shift+G (Desagrupar)

#### Scenario: Mouse leaves hides tooltip
- **WHEN** the user moves the mouse away from the help icon
- **THEN** the tooltip overlay SHALL disappear

### Requirement: Group/ungroup shortcuts
The system SHALL support Ctrl+G to group selected objects and Ctrl+Shift+G to ungroup.

#### Scenario: Ctrl+G groups selection
- **WHEN** the user presses Ctrl+G with 2+ objects selected
- **THEN** the selected objects SHALL be grouped

#### Scenario: Ctrl+Shift+G ungroups
- **WHEN** the user presses Ctrl+Shift+G while a group or group child is selected
- **THEN** the group SHALL be dissolved

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

