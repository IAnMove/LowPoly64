## 1. Project Setup

- [x] 1.1 Initialize Node.js project with `npm init` and create `package.json` with name "lowpoly64-editor"
- [x] 1.2 Install dependencies: `three` (runtime), `vite` (dev)
- [x] 1.3 Create Vite config (`vite.config.js`) with basic settings
- [x] 1.4 Create project structure: `src/` directory with `main.js` entry point, `src/modules/` for JS modules, `src/styles/` for CSS
- [x] 1.5 Create `index.html` at root that loads `src/main.js` as module, with the full UI layout (top bar, left panel, viewport, right panel) using Tailwind CDN
- [x] 1.6 Add npm scripts: `dev` (vite), `build` (vite build), `preview` (vite preview)

## 2. Core Scene Module

- [x] 2.1 Create `src/modules/state.js` — shared state store (scene, camera, renderer, orbitControls, transformControls, userObjects group, selectedMesh, config flags)
- [x] 2.2 Create `src/modules/scene.js` — init scene, camera (FOV 60), WebGLRenderer (antialias off), lights (ambient + directional), grid (50x50), floor plane, axes helper
- [x] 2.3 Implement responsive viewport sizing: resize renderer based on actual container dimensions, not hardcoded percentages
- [x] 2.4 Implement render loop with requestAnimationFrame, OrbitControls update, and renderer.render

## 3. Controls Setup

- [x] 3.1 Initialize OrbitControls with damping (factor 0.12), min/max distance (5/60)
- [x] 3.2 Initialize TransformControls, add to scene, wire `dragging-changed` event to disable/enable OrbitControls
- [x] 3.3 Wire TransformControls `change` event to update properties panel in real-time

## 4. Selection System

- [x] 4.1 Create `src/modules/selection.js` — raycaster setup, mouse coordinate calculation from canvas rect
- [x] 4.2 Implement `onMouseDown` handler: raycast against userObjects (recursive), select hit Mesh, ignore if TransformControls is dragging
- [x] 4.3 Implement `selectMesh(mesh)`: attach TransformControls, set emissive highlight (0x4488ff, intensity 0.4), show properties panel, update indicator
- [x] 4.4 Implement `deselect()`: restore original emissive, detach TransformControls, hide properties panel, clear indicator

## 5. Primitive Creation

- [x] 5.1 Create `src/modules/primitives.js` — `addPrimitive(type)` function for cube, sphere (8x6), cylinder (8 seg), cone (8 seg), plane, capsule (4x8)
- [x] 5.2 Each primitive: create geometry, apply default material, set userData.name, add to userObjects, position at (0,1,0), auto-select

## 6. Material System

- [x] 6.1 Create `src/modules/materials.js` — `createMaterial(type, options)` factory function supporting Basic/Lambert/Phong/Standard
- [x] 6.2 Implement `updateMaterialType(mesh, newType)` — replace material preserving color, texture, flatShading, wireframe
- [x] 6.3 Implement global `toggleFlatShading()` — iterate all userObjects children recursively, set flatShading, recompute normals
- [x] 6.4 Implement global `toggleWireframe()` — iterate all userObjects children recursively, toggle wireframe property
- [x] 6.5 Implement `setColor(mesh, hexColor)` and `randomRetroColor()` from predefined N64 palette
- [x] 6.6 Implement `quickColor(hex)` — apply color to selected object from palette overlay

## 7. Texture System

- [x] 7.1 Create `src/modules/textures.js` — `handleTextureUpload(event)` using FileReader + TextureLoader
- [x] 7.2 Implement `applyTexture(mesh, texture)` — set material.map, set needsUpdate
- [x] 7.3 Implement `toggleTexture()` — toggle material.map on/off while preserving texture reference in userData
- [x] 7.4 Implement `togglePixelated()` — switch between NearestFilter and LinearFilter, set needsUpdate

## 8. Properties Panel

- [x] 8.1 Create `src/modules/ui.js` — `updatePropertiesPanel()` reading selected mesh's position, rotation (to degrees), scale, color, material type, name
- [x] 8.2 Implement bidirectional binding: `updatePosition()`, `updateRotation()`, `updateScale()` reading panel inputs and applying to mesh
- [x] 8.3 Implement `updateName(value)` — update userData.name and top bar indicator
- [x] 8.4 Implement `updateColor(hex)` — update material color from panel color picker
- [x] 8.5 Implement `updateMaterial()` — read dropdown, call material system to swap material on selected mesh
- [x] 8.6 Wire all panel inputs to their respective update functions

## 9. Template Library

- [x] 9.1 Create `src/modules/templates.js` — `addTemplate(type)` function
- [x] 9.2 Implement chair template: seat (box), backrest (box), 4 legs (cylinders) in a Group with per-piece colors
- [x] 9.3 Implement table template: tabletop (box), 4 legs (cylinders) in a Group
- [x] 9.4 Implement character template: head (sphere), torso (box), 2 arms (cylinders), 2 legs (cylinders) in a Group with body-part colors
- [x] 9.5 Implement crate template: decorated box with distinct color
- [x] 9.6 Implement barrel template: cylinder body + ring details (torus or thin cylinders) in a Group

## 10. Scene Actions

- [x] 10.1 Implement `duplicateSelected()` — clone mesh/group, offset +1 on X, add to userObjects, auto-select clone
- [x] 10.2 Implement `deleteSelected()` — remove from parent, deselect, dispose geometry/material
- [x] 10.3 Implement `centerCameraOnSelected()` — set OrbitControls target to selected object's world position
- [x] 10.4 Implement `resetScene()` — remove all children from userObjects, deselect, dispose all

## 11. GLB Export

- [x] 11.1 Create `src/modules/export.js` — `exportGLB()` function using GLTFExporter
- [x] 11.2 Before export: clone userObjects, convert non-Standard materials to MeshStandardMaterial preserving colors
- [x] 11.3 Export in binary mode, create Blob from ArrayBuffer result, trigger download via temporary link, revoke URL

## 12. Scene Persistence

- [x] 12.1 Create `src/modules/persistence.js` — `serializeScene()` function: iterate userObjects, serialize each object's type, geometry params, position, rotation, scale, color, material type, name, group hierarchy
- [x] 12.2 Implement `deserializeScene(json)` — clear scene, rebuild objects from JSON data
- [x] 12.3 Implement `saveToLocalStorage()` and `loadFromLocalStorage()` using a fixed key
- [x] 12.4 Implement `exportSceneJSON()` — download JSON file via Blob
- [x] 12.5 Implement `importSceneJSON(file)` — read file, parse, call deserializeScene

## 13. Keyboard Shortcuts

- [x] 13.1 Create `src/modules/shortcuts.js` — `onKeyDown(event)` handler with input focus guard (skip if activeElement is input/select)
- [x] 13.2 Implement W/E/R shortcuts for translate/rotate/scale mode switch
- [x] 13.3 Implement Delete key to call deleteSelected()
- [x] 13.4 Implement Ctrl+D to call duplicateSelected(), with preventDefault to avoid browser bookmark

## 14. Snap System

- [x] 14.1 Implement `toggleSnap()` — toggle snap on/off, set TransformControls translationSnap (0.5), rotationSnap (PI/12), scaleSnap (0.25)
- [x] 14.2 Update snap indicator in viewport overlay to show current snap state

## 15. Integration & Wiring

- [x] 15.1 Create `src/main.js` — import all modules, call init, wire DOM event listeners to module functions
- [x] 15.2 Expose necessary functions to HTML onclick handlers (via window or event delegation)
- [x] 15.3 Verify full workflow: add primitive → select → transform → change material/color → apply texture → duplicate → export GLB
- [x] 15.4 Verify persistence: save scene → reload → load scene → verify objects restored
- [x] 15.5 Verify keyboard shortcuts work and are suppressed during text input
