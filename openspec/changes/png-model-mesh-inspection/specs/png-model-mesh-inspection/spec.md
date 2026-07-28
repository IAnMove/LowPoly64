## ADDED Requirements

### Requirement: Polygon overlay inspection
The PNG model preview SHALL provide a polygon-edge toggle that overlays the generated mesh topology on the textured preview without modifying generated materials, scene objects, or export output.

#### Scenario: Enable polygon inspection
- **WHEN** the user enables the polygon overlay after a valid preview is generated
- **THEN** the preview SHALL show high-contrast triangle edges over the textured surface and side walls

#### Scenario: Disable polygon inspection
- **WHEN** the user disables the polygon overlay
- **THEN** the overlay SHALL disappear while the textured preview remains unchanged

### Requirement: Vertex overlay inspection
The PNG model preview SHALL provide an independent vertex toggle that shows the generated vertex positions as bounded visible points and SHALL rebuild or dispose those points with the preview lifecycle.

#### Scenario: Show vertices independently
- **WHEN** the user enables vertices while polygon edges are disabled
- **THEN** the preview SHALL show vertex points without requiring the polygon overlay

#### Scenario: Regenerate while inspection is enabled
- **WHEN** density changes while either inspection overlay is enabled
- **THEN** the old overlay resources SHALL be disposed and the enabled overlays SHALL represent the newly generated geometry

### Requirement: Continuous bounded density control
The workbench SHALL expose mesh density as an integer slider from 12 through 72, SHALL show its current value immediately, and SHALL regenerate through the existing debounced workflow.

#### Scenario: Increase density
- **WHEN** the user moves density from a lower to a higher value
- **THEN** the workbench SHALL regenerate a denser bounded grid and retain the selected value in the editable recipe

#### Scenario: Restore an existing density
- **WHEN** an editable PNG-derived group is reopened
- **THEN** the slider SHALL display its stored normalized density without reducing it to a preset

### Requirement: Live topology counters
The workbench SHALL display vertex and triangle counts from the most recent successful generated payload next to the density control and SHALL keep the detailed analysis consistent with those values.

#### Scenario: Density changes topology counts
- **WHEN** a density change successfully regenerates the same silhouette
- **THEN** the displayed vertex and triangle counts SHALL update to the new payload values

### Requirement: Inspection settings remain editor-only
Polygon and vertex visibility SHALL persist only for the current browser session and SHALL NOT be included in scene save, compact object JSON, generated model metadata, undo history, or GLB export.

#### Scenario: Create with inspection enabled
- **WHEN** the user creates a model while both overlays are visible
- **THEN** the scene SHALL receive only the generated model meshes and recipe, without inspection overlay objects or settings
