## ADDED Requirements

### Requirement: Persist SVG source metadata for scene roundtrip
When a group originates from the SVG workbench, the system SHALL serialize optional SVG source metadata alongside that group so the original source mode, active SVG markup, and import settings survive `SAVE` and `LOAD`.

#### Scenario: Save and load a scene with an SVG-derived object
- **WHEN** the user saves a scene containing a group created from the SVG workbench and later loads that scene
- **THEN** the system SHALL restore both the generated geometry and the SVG source metadata required to reopen and rebuild that object from the workbench

#### Scenario: Load a scene without SVG metadata
- **WHEN** the user loads a legacy scene or a scene object that has no SVG source metadata
- **THEN** the system SHALL load it exactly as before without requiring SVG-specific fields
