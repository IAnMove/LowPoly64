## Why

Speech Lab currently opens outside the editor. Users need to make their scene characters speak, record performances and reuse the result without leaving Retrovisor.

## What Changes

- Add a docked Bocas y voz workspace alongside Scene 3D, using the existing mouth renderers and speech track format, with persistent settings across modes.
- Offer prepared characters and compatible characters already in the scene, face/body/whole-scene framing, microphone input and audio files.
- Add an avatar webcam stage with color/image backgrounds and video recording with audio and synchronized mouth frames.
- Export a speaking GLB, JSON motion, audio, video and a documented portable bundle; allow adding the speaking character to the editor.
- Redirect the former standalone lab into the workspace and retain the technical comparison through an explicit comparison query.
- Add real rendered thumbnails beside every default model in the editor catalog, generated reproducibly from existing geometry. Hocuspocus integration and an operating-system virtual webcam are outside this change.

## Capabilities

### New Capabilities
- `integrated-speech-studio`: Native editor speech preview, scene reuse, webcam recording and portable speech assets.

### Modified Capabilities

## Impact

Editor entry points, Character Studio, shared speech components, new native studio and capture modules, browser tests and usage documentation. No new external service is required; existing local Rhubarb remains optional.
