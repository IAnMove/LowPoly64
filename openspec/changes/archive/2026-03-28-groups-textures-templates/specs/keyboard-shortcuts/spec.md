## MODIFIED Requirements

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

## ADDED Requirements

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
