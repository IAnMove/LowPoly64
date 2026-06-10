## ADDED Requirements

### Requirement: Convert SVG input into scene-compatible custom geometry
The system SHALL convert a valid SVG source into scene objects built from `custom` geometry so the result remains compatible with the current editor's transform, material, texture, save/load, and GLB export flows.

#### Scenario: Import a filled SVG
- **WHEN** the user confirms import of a valid SVG that contains filled paths or shapes
- **THEN** the system SHALL extrude the SVG into 3D geometry, wrap it in a root group, add it to `userObjects`, and select that group

### Requirement: Handle stroke-based or icon-like SVGs with fill fallback
The system SHALL support SVGs that rely on `stroke`, `currentColor`, or pixel-like source data by converting them into filled SVG geometry before extrusion whenever direct shape extraction would not produce a useful solid.

#### Scenario: Import a stroke-only icon
- **WHEN** the active SVG source uses strokes without usable fills
- **THEN** the system SHALL rasterize or otherwise convert the source into a filled SVG representation before generating the 3D model

#### Scenario: Keep direct vector extrusion for filled SVGs
- **WHEN** the active SVG source already contains valid filled paths for extrusion
- **THEN** the system SHALL extrude those paths directly without forcing the rasterized fallback path

### Requirement: Expose extrusion settings with complexity guardrails
The import pipeline SHALL support user-facing extrusion settings and SHALL protect the editor from pathological SVG complexity with preflight checks, progress feedback, and cancellation/error messaging.

#### Scenario: Import a complex SVG
- **WHEN** the user attempts to import an SVG whose estimated geometry exceeds safe thresholds
- **THEN** the system SHALL warn the user before insertion and SHALL provide progress or cancellation feedback while geometry generation is running

#### Scenario: Import with custom extrusion settings
- **WHEN** the user changes depth, smoothness, scale, or related import settings before confirming
- **THEN** the generated model SHALL reflect those settings in the resulting scene object

### Requirement: Imported SVG models remain part of the normal editor flow
An imported SVG model SHALL behave like other user-created scene objects for selection, transformation, material editing, texture application, scene save/load, and GLB export.

#### Scenario: Edit and export an imported SVG model
- **WHEN** the user imports an SVG model and then applies transforms, materials, textures, or exports the scene
- **THEN** the imported object SHALL participate in those existing flows without requiring a separate rendering or export path

### Requirement: Object JSON roundtrip for SVG-derived models uses SVG source metadata
When the user exports an SVG-derived object through the object JSON workflow, the system SHALL serialize its `svgSource` and SVG import settings so the object can be regenerated on import without depending on serialized `custom` mesh payload size.

#### Scenario: Export and reimport an SVG-derived object as JSON
- **WHEN** the user exports a selected SVG-derived group as object JSON and later imports that JSON
- **THEN** the system SHALL rebuild the model from the saved `svgSource` and SVG import settings, rather than requiring the full generated mesh definition in the JSON payload
