## ADDED Requirements

### Requirement: Native editor speech workflow
The editor SHALL offer speech as a docked workspace in its main layout with shared Scene/Speech navigation, no popup or iframe, and undoable insertion of speaking characters.

#### Scenario: Switch workspaces
- **WHEN** the user switches between Scene and Speech
- **THEN** the shared navigation stays visible, the scene is preserved, speech settings and camera framing survive the switch, microphone and playback stop when leaving Speech, and no popup is created.

### Requirement: Reuse scene characters and composition
The studio SHALL offer prepared characters and compatible scene humanoids, editable mouth placement and face, body and whole-scene framing using independent copies.

#### Scenario: Scene preview
- **WHEN** a scene character is selected and the whole scene view is enabled
- **THEN** the character and other scene objects preserve their placement and the original scene is unchanged.

### Requirement: Microphone and recorded audio
The studio SHALL support audio files and explicitly activated microphone input driving mouth motion, with optional local phonetic analysis for files.

#### Scenario: Cancel microphone permission
- **WHEN** the studio closes while microphone permission is pending
- **THEN** a stream returned later is stopped and no microphone remains active.

### Requirement: Avatar stage and recording
The studio SHALL display a camera-like avatar stage with selectable color or image background and record its video, optional audio and synchronized mouth frames for up to 90 seconds.

#### Scenario: Finish a recording
- **WHEN** the user stops recording or reaches the duration limit
- **THEN** the resulting take can be downloaded with its audio and mouth track, which ends in a resting pose.

### Requirement: Portable speech exports
The studio SHALL export a model GLB containing a speech animation, a JSON speech track and a ZIP bundle with a manifest, optional audio and optional video.

#### Scenario: Reuse a take
- **WHEN** a user exports the recorded take
- **THEN** model animation, track and audio describe the same performance and documentation explains that audio is separate from GLB and external importer compatibility is unverified.

### Requirement: Recognizable default model catalog
The editor SHALL display a real geometry thumbnail on the right of every default catalog model entry, retaining labels, keyboard access and existing creation behavior. The image set SHALL cover the complete registry and be reproducibly generated from its constructors.

#### Scenario: Choose a model from its preview
- **WHEN** the user opens a model category and chooses a row containing its thumbnail
- **THEN** the pictured model is created using the existing template action, and all category entries have valid preview images without blocking the editor while off-screen images load.

### Requirement: Shared retro presentation
The Speech workspace SHALL match the editor pixel typeface, square outlined controls, black and zinc panels, and established yellow/cyan/magenta/green action colors.

#### Scenario: Use Speech on a narrow screen
- **WHEN** the workspace is opened on desktop or a narrow viewport
- **THEN** navigation and controls retain the editor visual language, remain usable without horizontal page scrolling and preserve the speech workflow.
