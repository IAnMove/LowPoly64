## 1. Undo/Redo Core

- [x] 1.1 Create `src/modules/undo.js` with undoStack, redoStack (max 50), `pushAction(action)`, `undo()`, `redo()`, `clearHistory()`
- [x] 1.2 Add `undoStack` and `redoStack` arrays to `state.js`
- [x] 1.3 Wire Ctrl+Z → `undo()` and Ctrl+Shift+Z → `redo()` in `shortcuts.js`
- [x] 1.4 Show toast on undo/redo ("Deshacer: [action type]" / "Rehacer: [action type]")

## 2. Undo — Register Actions in Existing Modules

- [x] 2.1 Register undo for `addPrimitive()`: capture created mesh ref, undo removes it, redo re-adds it
- [x] 2.2 Register undo for `addTemplate()`: capture created group ref, undo removes it, redo re-adds it
- [x] 2.3 Register undo for `deleteSelected()`: capture deleted objects with their parent + index, undo restores them
- [x] 2.4 Register undo for `duplicateSelected()`: capture cloned object ref, undo removes it, redo re-adds it
- [x] 2.5 Register undo for TransformControls: capture before-transform on `dragging-changed: true`, register action on `dragging-changed: false`
- [x] 2.6 Register undo for `setColor()` / `updateColorFromPanel()`: capture old color, undo restores it
- [x] 2.7 Register undo for material type change: capture old material type, undo restores it
- [x] 2.8 Register undo for `groupSelected()`: capture children + original transforms, undo dissolves group
- [x] 2.9 Register undo for `ungroupSelected()`: capture group + children, undo re-groups them
- [x] 2.10 Register undo for `applyTexture()` / `toggleTexture()`: capture before-state of material.map, undo restores
- [x] 2.11 Register undo for `importObjectFromJSON()`: capture created group ref, undo removes it

## 3. Undo — Transform Capture in Scene

- [x] 3.1 In `scene.js`, on TransformControls `dragging-changed` event: if starting drag, snapshot position/rotation/scale; if ending drag, call `pushAction` with before/after transforms
- [x] 3.2 Ensure undo/redo of transforms updates the properties panel if the object is selected

## 4. Selective Export

- [x] 4.1 Modify `exportGLB()` in `export.js`: determine export scope (selectedMeshes > selectedMesh > all userObjects)
- [x] 4.2 Create temporary Group with clones of selected objects when exporting selection
- [x] 4.3 Update export button text dynamically: "EXPORTAR SELECCIÓN" when objects selected, "EXPORTAR GLB" when nothing selected
- [x] 4.4 Wire selection changes to update the export button text in `ui.js` / `selection.js`

## 5. Color Picker

- [x] 5.1 Add `<input type="color" id="palette-color-picker">` next to the palette swatches in the viewport color zone in `index.html`
- [x] 5.2 Wire `palette-color-picker` `input` event: on change, call `quickColor(value)` to apply color to selected mesh in real-time
- [x] 5.3 Sync picker on selection: when an object is selected, update `palette-color-picker` value to the object's current color hex
- [x] 5.4 Sync `quickColor()` swatches with picker: when a swatch is clicked, also update `palette-color-picker` value
- [x] 5.5 Bidirectional sync with properties panel: changing viewport picker updates `#color` input in panel and vice versa
- [x] 5.6 Register color changes (from picker and swatches) as undoable actions via `pushAction`

## 6. Animation Core

- [x] 6.1 Create `src/modules/animation.js` with animation compilation, playback, and management functions
- [x] 6.2 Implement `compileAnimation(animDef, group)`: convert JSON animation definition → THREE.AnimationClip with KeyframeTrack(s)
- [x] 6.3 Implement euler-to-quaternion conversion for rotation tracks: each [rx, ry, rz] keyframe → [qx, qy, qz, qw]
- [x] 6.4 Implement `playAnimation(group, clipIndex)`: create/reuse AnimationMixer, play clip, set loop mode based on `loop` flag
- [x] 6.5 Implement `pauseAnimation()`, `resumeAnimation()`, `stopAnimation()`: control AnimationAction state
- [x] 6.6 Add animation state to `state.js`: `animationMixer`, `animationAction`, `animationClock`, `animationPlaying`
- [x] 6.7 Update render loop in `scene.js` to call `mixer.update(delta)` when animation is playing
- [x] 6.8 Implement `getAnimationProgress()`: return current time / duration for timeline UI

## 7. Animation Storage & Persistence

- [x] 7.1 Store animations on groups: `group.userData.animations` (JSON defs) and `group.userData.animationClips` (compiled clips)
- [x] 7.2 Update `serializeObject()` in `persistence.js` to include `animations` array from userData
- [x] 7.3 Update `deserializeObject()` in `persistence.js` to restore animations and recompile clips on load

## 8. Animation JSON Import

- [x] 8.1 Create `src/modules/animation-import.js` with `validateAnimationJSON(data)` and `importAnimationToGroup(jsonString, group)`
- [x] 8.2 Implement validation: name (string), duration (>0), tracks (non-empty array), each track has target/property/keyframes
- [x] 8.3 Extend `json-import.js`: when imported object JSON has `animations` array, compile and attach them to the group
- [x] 8.4 Add animation import section to import modal: separate textarea/button for importing animation to selected group
- [x] 8.5 Wire animation import button: validate, compile, attach to selected group, show toast

## 9. Animation Timeline UI

- [x] 9.1 Add timeline bar HTML to `index.html`: positioned at bottom of viewport, initially hidden
- [x] 9.2 Timeline contents: animation name dropdown, Play/Pause button, Stop button, progress bar, time display
- [x] 9.3 Implement `updateTimeline()` in `ui.js`: update progress bar and time display on each frame when playing
- [x] 9.4 Show/hide timeline based on selection: visible when selected object has animations, hidden otherwise
- [x] 9.5 Wire Play/Pause button to `playAnimation`/`pauseAnimation`/`resumeAnimation`
- [x] 9.6 Wire Stop button to `stopAnimation`
- [x] 9.7 Wire animation dropdown to switch between multiple animations on the same object
- [x] 9.8 Add Space shortcut for play/pause toggle in `shortcuts.js`

## 10. GLB Export with Animations

- [x] 10.1 Modify `exportGLB()` to collect AnimationClips from exported objects' `userData.animationClips`
- [x] 10.2 Pass collected clips to GLTFExporter via `{ animations: clips }` option
- [x] 10.3 Ensure animation track names reference node names correctly (match `userData.name` used in mesh.name)
- [x] 10.4 Set mesh.name = userData.name on export clones so animation tracks can find their targets

## 11. ask-animation.md and Documentation

- [x] 11.1 Create `ask-animation.md` with LLM prompt: animation JSON schema, supported properties, interpolation, full example
- [x] 11.2 Update `README.md`: add animation system section, animation import workflow, color picker, updated keyboard shortcuts
- [x] 11.3 Update `ask.md`: mention optional `animations` field in object import format

## 12. UI Updates & Wiring

- [x] 12.1 Update shortcuts tooltip in `index.html` with Ctrl+Z, Ctrl+Shift+Z, Space
- [x] 12.2 Add animation import section to import modal (textarea + button for animation-only import)
- [x] 12.3 Update `main.js`: import and expose new functions (undo, redo, animation controls, animation import, color picker sync)
- [x] 12.4 Wire selection change events to update export button text, timeline visibility, and color picker sync
- [x] 12.5 Style timeline bar with retro theme (black bg, yellow accents, Press Start 2P font)

## 13. Integration & Verification

- [x] 13.1 Verify: create objects, move, delete, undo each step, redo — all state consistent
- [x] 13.2 Verify: select 2 objects → export → only those 2 in GLB; deselect → export → all objects
- [x] 13.3 Verify: import animation JSON → play → pause → stop → objects return to rest
- [x] 13.4 Verify: export group with animation as GLB → open in glTF viewer → animation plays
- [x] 13.5 Verify: save scene with animations → load → animations still playable
- [x] 13.6 Verify: import object with embedded animations → animations attached and playable
- [x] 13.7 Verify: color picker syncs with palette swatches and properties panel bidirectionally
- [x] 13.8 Run `npx vite build` — all modules compile without errors
