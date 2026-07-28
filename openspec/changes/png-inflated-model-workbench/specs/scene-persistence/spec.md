## ADDED Requirements

### Requirement: Persist PNG-derived model recipes
The system SHALL serialize a PNG-derived group's normalized source image, validated generation settings, alpha/crop analysis, bounded manual depth map, and generated child geometry/material data. Loading the scene SHALL restore both the visible model and enough recipe data to reopen it for editing.

#### Scenario: Save and load a corrected PNG model
- **WHEN** a scene containing a PNG-derived model with painted depth corrections is saved and loaded
- **THEN** its visible geometry, texture, settings, source metadata, and manual depth map SHALL be restored

#### Scenario: Load a scene without PNG metadata
- **WHEN** a legacy scene contains no PNG-derived metadata
- **THEN** the system SHALL load it exactly as before without requiring new fields

### Requirement: Compact JSON roundtrip for PNG-derived models
Compact object JSON export SHALL preserve the PNG-derived recipe and generated representation, and importing that JSON SHALL reconstruct an editable PNG-derived group without accessing an external file path.

#### Scenario: Export and reimport a PNG model definition
- **WHEN** the user exports a PNG-derived group as object JSON and imports it into a new scene
- **THEN** the imported group SHALL retain its generated appearance and SHALL reopen in the PNG model workbench
