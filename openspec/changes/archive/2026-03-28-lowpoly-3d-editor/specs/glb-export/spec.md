## ADDED Requirements

### Requirement: Export scene to GLB
The system SHALL export the entire `userObjects` group to a binary .glb file using GLTFExporter.

#### Scenario: Export full scene
- **WHEN** the user clicks "EXPORTAR .GLB"
- **THEN** the system SHALL export all objects in userObjects to a .glb file and trigger a browser download with filename "lowpoly64-scene.glb"

### Requirement: Binary GLB format
The export SHALL use GLTFExporter in binary mode (GLB), producing a single self-contained file.

#### Scenario: Export produces valid GLB
- **WHEN** the export completes
- **THEN** the resulting file SHALL be a valid .glb file that can be opened in Blender, Three.js, and other glTF-compatible tools

### Requirement: Download via Blob
The system SHALL create a Blob from the GLTFExporter result, generate a temporary object URL, trigger a download via programmatic link click, and revoke the URL afterwards.

#### Scenario: Automatic download
- **WHEN** the export completes
- **THEN** a download SHALL start automatically without requiring user interaction beyond the initial export button click

### Requirement: Material compatibility for export
Before exporting, the system SHALL ensure materials are glTF-compatible. MeshBasicMaterial and MeshLambertMaterial SHALL be converted to MeshStandardMaterial equivalents for the export to maintain visual fidelity in the .glb file.

#### Scenario: Lambert material exports correctly
- **WHEN** an object with MeshLambertMaterial is exported
- **THEN** it SHALL appear in the .glb file with a PBR material that approximates the original color and appearance
