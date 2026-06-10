## ADDED Requirements

### Requirement: Open SVG workbench from the editor
The system SHALL expose an SVG workbench entrypoint inside the current editor UI. The workbench SHALL open from a dedicated action in the left tool area, and it SHALL also be reopenable for a selected object that was originally created from SVG source metadata.

#### Scenario: Open from the main editor UI
- **WHEN** the user clicks the SVG import/workbench action in the editor
- **THEN** the system SHALL open the SVG workbench modal with empty default inputs and import settings

#### Scenario: Reopen for an imported SVG object
- **WHEN** the user selects a group that contains persisted SVG source metadata and chooses to edit its SVG source
- **THEN** the workbench SHALL reopen prefilled with the saved source, source mode, and extrusion settings for that object

### Requirement: Support multiple SVG source modes
The workbench SHALL support authoring SVG input from four source modes: raw SVG code, uploaded `.svg` files, a pixel grid editor that emits SVG paths, and text converted to SVG paths.

#### Scenario: Author from SVG code
- **WHEN** the user pastes valid SVG markup into the code mode
- **THEN** the workbench SHALL accept that SVG as the active source for preview and import

#### Scenario: Author from file upload
- **WHEN** the user uploads a valid `.svg` file in file mode
- **THEN** the workbench SHALL load the file contents as the active source and show the loaded filename in the UI

#### Scenario: Author from pixel mode
- **WHEN** the user draws or erases cells in the pixel editor
- **THEN** the workbench SHALL regenerate the active SVG source from the traced pixel contours

#### Scenario: Author from text mode
- **WHEN** the user enters text and selects a supported font in text mode
- **THEN** the workbench SHALL regenerate the active SVG source as path-based SVG markup suitable for 3D extrusion

### Requirement: Preview and confirm SVG import settings
The workbench SHALL provide an import preview flow where the user can inspect the active SVG source, adjust extrusion-related settings, and explicitly insert a new object or update the selected SVG-derived object.

#### Scenario: Insert a new object from the workbench
- **WHEN** the user has a valid active SVG source and confirms import
- **THEN** the system SHALL create a new scene object from that SVG and select the resulting root group

#### Scenario: Update an existing SVG-derived object
- **WHEN** the user reopens the workbench for an existing SVG-derived object, changes the source or settings, and confirms update
- **THEN** the system SHALL rebuild that object's geometry in place while preserving its role as the selected object and recording the change in undo/redo history
