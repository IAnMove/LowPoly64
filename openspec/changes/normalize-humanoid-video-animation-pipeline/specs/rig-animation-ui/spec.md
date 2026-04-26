## ADDED Requirements

### Requirement: Rig UI imports standard humanoid animation assets
The rig and animation UI SHALL import Fast Poser/Animateur humanoid animation assets onto compatible standard or legacy humanoid models.

#### Scenario: Import standard animation onto standard humanoid
- **WHEN** a user imports a `fast-poser-asset` animation that targets standard humanoid bones
- **THEN** the rig UI SHALL create playable tracks for a selected `HUMANOID_STANDARD` model

#### Scenario: Import standard animation onto legacy humanoid
- **WHEN** a user imports a `fast-poser-asset` animation that targets standard humanoid bones onto a legacy humanoid model
- **THEN** the rig UI SHALL resolve compatible target nodes through humanoid aliases and create playable tracks

### Requirement: Rig UI exports playable humanoid clips as standard assets
The rig and animation UI SHALL export playable humanoid clips using the standard Fast Poser/Animateur interchange contract.

#### Scenario: Export rig clip as Fast Poser asset
- **WHEN** a user exports a playable humanoid animation clip from the rig UI
- **THEN** the exported asset SHALL include `format: "fast-poser-asset"`, `version: 1`, `type: "animation"`, and standard humanoid bone names

#### Scenario: Export preserves character index suffixes
- **WHEN** a clip contains tracks for one humanoid character
- **THEN** exported track names SHALL include the character index suffix expected by the Fast Poser/Animateur importer

### Requirement: Rig playback remains correct after alias resolution
The rig and animation UI SHALL preview and play animations correctly after resolving standard and legacy humanoid aliases.

#### Scenario: Preview standard clip on legacy template
- **WHEN** a standard humanoid clip is loaded on a legacy humanoid template
- **THEN** the model viewport and skeleton viewport SHALL animate matching body parts without missing compatible limb, torso, head, or hand tracks

#### Scenario: Preserve rest positions during playback
- **WHEN** an imported humanoid animation omits or ignores non-root child position tracks
- **THEN** rig playback SHALL keep child bones at their target rest positions while applying rotation and root motion tracks

### Requirement: Video animation imports expose usable errors and preview state
The rig and animation UI SHALL surface clear preview and error states for video-derived humanoid animation imports.

#### Scenario: Imported video animation has no compatible tracks
- **WHEN** a video-derived animation is imported onto a selected model and no compatible humanoid targets can be resolved
- **THEN** the UI SHALL report that the animation cannot be mapped instead of creating an empty playable clip

#### Scenario: Imported video animation is partially compatible
- **WHEN** a video-derived animation resolves only part of the humanoid body
- **THEN** the UI SHALL keep the compatible tracks playable and identify that the import was partial
