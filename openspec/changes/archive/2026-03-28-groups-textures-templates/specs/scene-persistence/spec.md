## MODIFIED Requirements

### Requirement: Save scene to localStorage
The system SHALL serialize the current scene state to JSON and store it in localStorage. Upon successful save, a toast notification "Escena guardada" SHALL appear for 2 seconds.

#### Scenario: Save scene with feedback
- **WHEN** the user clicks the "SAVE" button
- **THEN** the scene SHALL be saved to localStorage AND a toast notification SHALL appear confirming the save

### Requirement: Load scene from localStorage
The system SHALL reconstruct the scene from a previously saved JSON state in localStorage. Before loading, it SHALL show a confirmation dialog "Cargar escena guardada? Se perderan los cambios actuales."

#### Scenario: Load with confirmation
- **WHEN** the user clicks the "LOAD" button and a saved state exists
- **THEN** a confirmation dialog SHALL appear, and only upon confirmation SHALL the scene be cleared and rebuilt

#### Scenario: Load cancelled
- **WHEN** the user clicks "LOAD" and then cancels the confirmation
- **THEN** the scene SHALL remain unchanged

#### Scenario: No saved state with feedback
- **WHEN** the user clicks "LOAD" and no saved state exists in localStorage
- **THEN** a toast notification "No hay escena guardada" SHALL appear

## ADDED Requirements

### Requirement: Toast notification system
The system SHALL provide a reusable toast notification function that displays a message overlay for a configurable duration (default 2 seconds), positioned at the bottom-center of the viewport.

#### Scenario: Toast appears and disappears
- **WHEN** a toast is triggered with message "Escena guardada"
- **THEN** a styled notification SHALL appear at the bottom-center of the viewport and auto-dismiss after 2 seconds
