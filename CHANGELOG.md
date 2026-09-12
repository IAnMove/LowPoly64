# Changelog

All notable changes to Retrovisor 3D are documented here.

## [Unreleased]

## [0.9.0] — Release candidate

### Added

- Real WebP thumbnails on the right of every default model catalog entry, generated from the 305 registered templates with lazy image loading.

- Reusable PSX/N64 bodies and heads in Character Studio, directed swordsman/plumber studies and saved character recipes.
- Compatible animated copies with the supported 24-bone GLB donor profile, native skins and clip roundtrips.
- Nora, Ivo, Mara and Bruno in Avatar Forge, with twelve editable facial drawings.
- Character agent capabilities, catalogs, drafts, three-view renders, bounded corrections, undoable commits and complete downloadable artifacts.
- Optional API/local provider adapters with per-model capability checks.
- **Speech Lab · beta**: Mario, Cloud and Exploradora; SVG, cutout and 3D jaw mouths; voice intensity, prepared/local Rhubarb gestures, JSON tracks and animated GLB export.
- Docked Speech & voice workspace beside 3D Scene with persistent settings, camera and tracks, safe capture suspension and scene character reuse, editable mouth placement, webcam/body/whole-scene framing and color/image backgrounds.
- Video and separate voice recording with synchronized mouth tracks, persistent latest take during the page session, portable ZIP bundles and undoable scene insertion.
- Direct sidebar access, engine availability/setup feedback and a three-character video demonstration.

### Fixed

- Avatar facial placement, accessory anchors, hairline clipping and excessive ear geometry.
- Native GLB skin/animation persistence and independent animation targets in multi-character exports.
- Truncated agent artifacts and character draft conflicts with manual edits.
- Stale speech results after cancellation, late microphone activation and character changes resetting playback.
- Clear feedback when a static or unconfigured lab cannot analyze new recordings.
- Saved automatic gesture tracks retain validated Rhubarb provenance and reopen in the correct analysis mode.
- Agent startup and default allowed origins now use the editor's port 5176.

### Scope

- Speech is approximate and supports prepared characters and compatible scene heads. GLB contains movement; audio is separate. Microphone intensity can be recorded with video. No OS virtual camera or verified Hocuspocus importer is included.
- New phonetic analysis needs an optional local engine. Universal GLB facial rigging and arbitrary donor skeletons are not supported.
- Provider protocol tests do not certify real LLM quality. See RELEASE.md and the candidate review for current evidence.

## [0.8.0] — 2026-07-29

### Added

- Local-first in-app agent and MCP bridge backed by the validated scene-command
  registry, undo/redo and a local Node companion.
- PNG/WebP to closed 2.5D model workbench with paintable inflate/deflate maps.
- Generated Avatar Forge heads, six Starter Hero recipes, section dice,
  turntable preview, recipe copy and legacy-head migration.
- Seven character templates: Black Mage, Skull Knight, Chibi Ninja, Mecha
  Unit, Fenix Chick, Drake Pup and Cloud FF7 by Kimi.
- Six `HUMANOID_STANDARD` activity clips: `smoke`, `pickaxe`, `shovel`, `sit`,
  `sleep` and `cheer`; rebuilt `die` clip.
- Local-video Motion Ripper controls, frame stepping, playback speeds and
  humanoid retargeting.
- SVG workbench/head lab, style-budget diagnostics, fake retro ambient
  occlusion and a headless render/report CLI.
- Deterministic release captures for the agent, PNG model, Avatar Forge,
  animation library and Motion Ripper.

### Changed

- Replaced runtime Tailwind CDN and Google Font requests with generated CSS and
  a repository-local Press Start 2P font.
- Vite updated to `^8.0.16`.
- Security updates: PostCSS 8.5.24, Nano ID 3.3.16, MCP SDK 1.30.0 and
  `@hono/node-server` 2.0.12.
- Playwright and render scripts now control Vite programmatically on Windows.
- Playwright traces and release videos are opt-in to control disk usage.
- Avatar visual audits reuse previews and release Three.js resources between
  cases.
- Feature slabs use explicit per-face UVs and near-flush face placement.

### Fixed

- Motion Ripper could throw `ReferenceError: setPreviewStatus is not defined`
  while opening the modal.
- Rig smoke coverage incorrectly treated bone position as proof of animation;
  orientation is now observed.
- Avatar Forge placement, contour and mold tests used stale edge and surface
  assumptions.
- Character face-decal checks did not recognize decal-backed slabs.
- Several long-running avatar and animation flows used timeouts too short for
  slower Windows/browser runs.
- Playwright could leave Vite alive and hang after otherwise successful tests.

## [0.7.0] — 2026-04-04

- Sprite-sheet texture mode, tile navigation, tile generation/editing, UV grid
  snapping, texture auto-save and downloadable snapshots.

## [0.6.0] — 2026-04-04

- AI texture prompt templates, expanded prompt editor and optional Ollama
  enhancement workflow.

## [0.5.0] — 2026-04-03

- OpenAI and local Stable Diffusion texture generation.

## [0.4.0] — 2026-04-03

- Archetype/slot rig system, CharacterModel format, reusable skeletons,
  animation profiles and rig UI.

## [0.3.0] — 2026-03-29

- Configurable pivots, piece hierarchy and JSON keyframe animations.

## [0.2.0] — 2026-03-28

- Groups, improved textures, template library and object JSON import.

## [0.1.0] — 2026-03-28

- Initial low-poly N64/PS1 editor with primitives, transforms, materials,
  painting, retro effects, GLB export and local persistence.
