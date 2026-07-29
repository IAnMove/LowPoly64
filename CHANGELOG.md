# Changelog

All notable changes to Retrovisor 3D are documented here.

## [Unreleased]

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
