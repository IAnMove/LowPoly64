## ADDED Requirements

### Requirement: Scene initialization
The system SHALL create a Three.js scene with PerspectiveCamera (FOV 60), WebGLRenderer (antialias off for retro look), AmbientLight, and DirectionalLight upon application start.

#### Scenario: App loads successfully
- **WHEN** the user opens the application in a browser
- **THEN** a 3D viewport SHALL render with a visible grid, axes helper, and floor plane

### Requirement: Camera orbit controls
The system SHALL provide OrbitControls with damping enabled, allowing the user to orbit, pan, and zoom the camera.

#### Scenario: User orbits the camera
- **WHEN** the user clicks and drags on the viewport
- **THEN** the camera SHALL orbit around the scene center smoothly with damping

### Requirement: Grid and floor reference
The system SHALL display a 50x50 GridHelper with yellow primary lines and dark secondary lines, plus a flat floor plane for visual reference.

#### Scenario: Grid visible at startup
- **WHEN** the scene loads
- **THEN** a grid and floor plane SHALL be visible at Y=0

### Requirement: Responsive viewport sizing
The system SHALL dynamically resize the renderer to fill the available viewport space between the left and right panels, recalculating on window resize.

#### Scenario: Window resize
- **WHEN** the user resizes the browser window
- **THEN** the 3D viewport SHALL resize proportionally and the camera aspect ratio SHALL update

### Requirement: Render loop
The system SHALL run a continuous requestAnimationFrame loop updating OrbitControls and rendering the scene.

#### Scenario: Continuous rendering
- **WHEN** the application is running
- **THEN** the scene SHALL render at the browser's refresh rate without frame drops for scenes with fewer than 100 low-poly objects
