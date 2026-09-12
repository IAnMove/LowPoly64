## Context

The standalone lab already supplies three mouth renderers, portable speech tracks, preset recipes and local audio analysis. The editor owns scene objects and undoable GLB import. The new studio must share those capabilities without taking ownership of editor resources.

## Goals / Non-Goals

**Goals:** Native entry and lifecycle; compatible scene character selection; camera stage; optional microphone; complete scene snapshots; recordings and documented reusable assets.

**Non-Goals:** Physical webcam capture, an OS virtual-camera driver, universal face detection, verified Hocuspocus import, automatic phoneme recognition from a live microphone.

## Decisions

- Integrate speech as a docked workspace beside 3D Scene, with shared editor navigation and no dialog, overlay or iframe. Switching workspaces preserves voice, mouth and camera settings, stops live input and refreshes scene snapshots. Old lab URLs lead to this workspace; the comparison prototype remains available with an explicit comparison query.
- Clone editor models with independent geometry/materials and preserved skeletons. Scene preview is a snapshot, and adding a speaking model creates an undoable copy. Source scene edits are never implicit.
- Composite a transparent WebGL preview over a color/image into a fixed 1280×720 canvas. This same canvas is recorded so the saved framing and background match the stage.
- Use MediaRecorder with supported MIME negotiation and optional audio tracks. Capture mouth frames on the recording clock, force rest at the end, retain the latest take while the editor page stays open, and stop owned tracks on close/error.
- Export a GLB with a `speech` clip, separate speech JSON and audio, plus video and a manifest in ZIP. GLB does not contain sound. Recording locks model/audio changes so exports describe the recorded performance.

## Risks / Trade-offs

- [Unfamiliar head proportions] → Prefer saved anchors; expose mouth placement controls for inferred compatible heads.
- [Browser recording support] → Detect capability, negotiate formats, display actionable errors, keep model/track exports available.
- [Permission races] → Request microphone only from its button, cancel late streams, release resources on close.
- [Source scene resource corruption] → Clone and dispose only owned resources; test original object identity and transforms.
- [Unconfirmed Hocuspocus format] → Document a neutral bundle and defer importer claims until its contract is known.

## Migration Plan

Switch editor entry points to the native studio, keep old URLs functional, add targeted unit/browser coverage and update local usage documentation. The entry point can be reverted independently of the existing lab.
