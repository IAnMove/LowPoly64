## Context
Character Studio already provides semantic recipes, humanoid joints, JSON/GLB persistence and an authored PSX hero. Speech rendering needs a shared, testable driver and deliberately different mouth implementations.

## Goals / Non-Goals
**Goals:** a recognizable rounded N64 plumber, preserved Cloud recipe, three usable mouth prototypes, local audio demonstration, editable cues and exported animated samples.
**Non-Goals:** a production phoneme recognizer, cloned character voice or perfect lip synchronization from arbitrary recordings.

## Decisions
- Add opt-in plumber body/head/cap/overalls profiles to the existing compiler. Keep named joints and recipe format so exports and part editing use existing paths.
- Keep signal analysis pure and separate from Three.js mouth renderers and browser audio playback. Sound intensity drives opening; timed visemes provide explicit vowel/closed poses.
- SVG poses use separate textured planes and animated scale visibility so the animation can be baked into ordinary GLB node tracks. Cutout and jaw modes use geometry/transform animation.
- A local laboratory displays all three modes on copies of the same head, supports silent manual scrubbing and only plays sound or starts the microphone after a click.
- Include system-synthesized local demo speech with clear attribution, plus cue data. User audio is decoded locally in the browser.

## Risks / Trade-offs
- Amplitude is not phonetic recognition → label it clearly and provide authored viseme cues.
- Mouth/head intersections → inspect front/profile views and use a shared surface anchor.
- SVG texture and animation export incompatibilities → await textures and reimport actual GLBs in browser tests.
- Existing character regression → preserve Cloud recipe and geometry checks plus default-profile tests.

## Local automatic speech experiment
- Add an opt-in local Rhubarb phonetic recognizer that emits the existing viseme cue contract. Keep amplitude and automatic gestures comparable over the same audio.
- Analyze decoded mono PCM WAV through a loopback-only development/preview endpoint, with bounded uploads, duration, process time and concurrency. No audio leaves the computer.
- Include a preanalyzed Spanish voice example for static builds. Recognition remains approximate; this experiment does not add live microphone phoneme recognition or facial skin deformation.
- Replace the regular cap dome with a lofted crown, narrow band and crescent visor while preserving HEAD anchors and recipe parameters.
