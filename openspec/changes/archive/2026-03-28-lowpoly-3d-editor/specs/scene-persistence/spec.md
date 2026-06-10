## ADDED Requirements

### Requirement: Save scene to localStorage
The system SHALL serialize the current scene state (all objects in userObjects with their position, rotation, scale, color, material type, geometry type, name, and group hierarchy) to JSON and store it in localStorage.

#### Scenario: Save scene
- **WHEN** the user triggers a save action
- **THEN** the scene state SHALL be serialized to JSON and stored in localStorage under a known key

### Requirement: Load scene from localStorage
The system SHALL be able to reconstruct the scene from a previously saved JSON state in localStorage.

#### Scenario: Load saved scene
- **WHEN** the user triggers a load action and a saved state exists in localStorage
- **THEN** the current scene SHALL be cleared and rebuilt from the saved JSON, restoring all objects with their properties

#### Scenario: No saved state
- **WHEN** the user triggers a load action and no saved state exists
- **THEN** the system SHALL show a notification that no saved scene was found

### Requirement: Export/import scene as JSON file
The system SHALL support exporting the scene state as a downloadable .json file and importing a .json file to restore the scene.

#### Scenario: Export scene JSON
- **WHEN** the user exports the scene as JSON
- **THEN** a .json file download SHALL be triggered with the serialized scene state

#### Scenario: Import scene JSON
- **WHEN** the user imports a .json scene file
- **THEN** the scene SHALL be cleared and rebuilt from the imported JSON data

### Requirement: Reset scene
The system SHALL provide a "RESET ESCENA" function that removes all user objects and clears the selection.

#### Scenario: Reset scene
- **WHEN** the user clicks "RESET ESCENA"
- **THEN** all objects in userObjects SHALL be removed, TransformControls SHALL detach, and the properties panel SHALL hide
