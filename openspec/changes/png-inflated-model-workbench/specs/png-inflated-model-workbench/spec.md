## ADDED Requirements

### Requirement: Transparent image ingestion
The system SHALL accept local PNG and WebP images with alpha in the PNG model workbench, SHALL reject unsupported or oversized inputs with a clear error, and SHALL crop transparent padding using a configurable alpha threshold.

#### Scenario: Load a transparent PNG
- **WHEN** the user selects a bounded PNG containing transparent padding and an opaque subject
- **THEN** the workbench SHALL detect the subject bounds and show the cropped silhouette without mutating the scene

#### Scenario: Reject an unusable image
- **WHEN** the user selects an unsupported, oversized, or fully transparent image
- **THEN** the workbench SHALL keep the scene unchanged and explain why generation cannot continue

### Requirement: Closed inflated mesh generation
The system SHALL generate a bounded closed 2.5D mesh from the detected alpha silhouette. Front and back displacement SHALL be derived from distance to the silhouette edge, validated thickness and bulge settings, and the manual depth map. The generated surface SHALL retain source-image UV coordinates and the generated boundary SHALL have side walls.

#### Scenario: Generate a textured volume
- **WHEN** a valid silhouette is loaded and the user requests preview generation
- **THEN** the preview SHALL contain textured front and back surfaces plus side walls with finite geometry, normals, and UVs

#### Scenario: Preserve a narrow opaque feature
- **WHEN** an opaque feature occupies part of a sampled grid cell above the alpha threshold
- **THEN** cell classification SHALL use bounded area sampling so the feature is not discarded solely because the cell center is transparent

### Requirement: Bounded generation controls
The workbench SHALL expose validated controls for target size, mesh density, alpha threshold, thickness, bulge curve, smoothing, back texture mirroring, and side color. It SHALL bound image dimensions, grid resolution, vertex count, and stored metadata.

#### Scenario: Clamp an out-of-range setting
- **WHEN** saved or imported settings exceed supported bounds
- **THEN** the workbench SHALL clamp or reject them before geometry allocation and SHALL report a warning

### Requirement: Paintable local depth correction
The workbench SHALL provide inflate, deflate, smooth, and erase tools over a bounded signed manual depth map. It SHALL expose brush radius and strength, visualize positive and negative corrections, and sample the same map across mesh-density changes.

#### Scenario: Inflate a local region
- **WHEN** the user paints with the inflate tool over the subject and regenerates the preview
- **THEN** vertices in that region SHALL gain more depth while unpainted regions retain their automatic depth

#### Scenario: Correct an excessive automatic bulge
- **WHEN** the user paints with the deflate tool over an overly thick region
- **THEN** the regenerated preview SHALL reduce local depth without requiring source-code edits

### Requirement: Isolated preview and atomic insertion
Preview and painting operations SHALL not mutate the main scene. Inserting a preview SHALL create one selected PNG-derived group with stable metadata, and updating a selected PNG-derived group SHALL apply the regenerated result atomically.

#### Scenario: Cancel the workbench
- **WHEN** the user loads an image, changes controls, paints corrections, and cancels
- **THEN** the main scene and undo stack SHALL remain unchanged

#### Scenario: Insert generated model
- **WHEN** the user accepts a valid preview
- **THEN** the system SHALL add one selected derived group, refresh the object list and properties panel, and emit the normal scene-change event

### Requirement: Reopen and edit a derived model
The properties panel SHALL identify a selected PNG-derived group and SHALL allow reopening the workbench with its source, settings, and manual depth map restored.

#### Scenario: Reopen a saved correction map
- **WHEN** the user selects a PNG-derived group and chooses edit
- **THEN** the workbench SHALL restore the original normalized image, current controls, paint map, and update mode

### Requirement: Standard export compatibility
PNG-derived groups SHALL remain ordinary Retrovisor scene objects for viewport capture and GLB export. Export SHALL include generated geometry and available texture data without requiring the workbench to be open.

#### Scenario: Export a generated model
- **WHEN** the user exports a PNG-derived group as GLB
- **THEN** the exported asset SHALL contain its generated surfaces and side walls using the existing export workflow
