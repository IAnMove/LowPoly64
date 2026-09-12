import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  SPEECH_VISEMES,
  analyzeSpeechAudio,
  framesFromCues,
  normalizeSpeechCues,
  sampleSpeechFrame,
  speechTrackFromJSON,
  speechTrackToJSON,
  validateSpeechCues,
} from '../src/modules/character-studio/speech/speech-core.js';
import { createSpeechMouth } from '../src/modules/character-studio/speech/speech-mouths.js';

function voicedSamples(sampleRate = 1000, seconds = 1) {
  const samples = new Float32Array(sampleRate * seconds);
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    if (time >= 0.2 && time < 0.7) samples[index] = Math.sin(time * Math.PI * 2 * 120) * 0.8;
  }
  return samples;
}

test('analyzeSpeechAudio gates silence and returns bounded voiced frames', () => {
  const track = analyzeSpeechAudio(voicedSamples(), 1000, { fps: 20, noiseGate: 0.04, smoothing: 0.25 });
  assert.equal(track.version, 1);
  assert.equal(track.fps, 20);
  assert.equal(track.duration, 1);
  assert.equal(track.frames.length, 20);
  assert.deepEqual(track.frames[0].viseme, 'rest');
  assert.equal(track.frames[0].open, 0);
  assert.equal(track.frames.at(-1).open, 0);
  assert.ok(track.frames.some((frame) => frame.open > 0.4));
  track.frames.forEach((frame) => {
    assert.ok(Number.isFinite(frame.time));
    assert.ok(frame.open >= 0 && frame.open <= 1);
    assert.ok(frame.wide >= 0 && frame.wide <= 1);
    assert.ok(frame.round >= 0 && frame.round <= 1);
    assert.ok(SPEECH_VISEMES.includes(frame.viseme));
  });
});

test('sampleSpeechFrame interpolates and applies the track noise gate', () => {
  const track = {
    duration: 1,
    noiseGate: 0.04,
    frames: [
      { time: 0, open: 0, wide: 0, round: 0, viseme: 'rest' },
      { time: 1, open: 1, wide: 0.8, round: 0.1, viseme: 'A' },
    ],
  };
  const middle = sampleSpeechFrame(track, 0.5);
  assert.ok(middle.open > 0.45 && middle.open < 0.55);
  assert.equal(middle.viseme, 'A');
  assert.deepEqual(sampleSpeechFrame(track, -2).viseme, 'rest');
  assert.equal(sampleSpeechFrame({ frames: [{ time: 0, open: 0.02, wide: 1, round: 1, viseme: 'O' }] }, 0).open, 0);
});

test('explicit vowels and closed M survive frame normalization and noise gating', () => {
  for (const viseme of ['A', 'E', 'I', 'O', 'U']) {
    const sampled = sampleSpeechFrame({ frames: [{ time: 0, open: 0.5, wide: 0.5, round: 0.5, viseme }] }, 0);
    assert.equal(sampled.viseme, viseme);
  }
  const closedM = sampleSpeechFrame({ frames: [{ time: 0, open: 0, wide: 0, round: 0, viseme: 'M' }] }, 0);
  assert.equal(closedM.open, 0);
  assert.equal(closedM.viseme, 'M');
});

test('speech cues validate exact viseme vocabulary and normalize order', () => {
  const invalid = validateSpeechCues({ version: 1, cues: [{ start: 0, end: 1, viseme: 'X' }] });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((error) => error.path === 'cues[0].viseme'));
  assert.deepEqual(invalid.errors.find((error) => error.path === 'cues[0].viseme').allowed, SPEECH_VISEMES);

  const normalized = normalizeSpeechCues({
    version: 1,
    cues: [
      { start: 0.4, end: 0.7, viseme: 'a' },
      { start: 0, end: 0.2, viseme: 'REST' },
      { start: 0.2, end: 0.4, viseme: 'A' },
    ],
  });
  assert.deepEqual(normalized.cues, [
    { start: 0, end: 0.2, viseme: 'rest' },
    { start: 0.2, end: 0.7, viseme: 'A' },
  ]);
});

test('framesFromCues creates a JSON-safe track without phonetic guessing', () => {
  const track = framesFromCues({
    version: 1,
    cues: [
      { start: 0.25, end: 0.75, viseme: 'O' },
    ],
  }, { duration: 1, fps: 10, frames: Array.from({ length: 10 }, (_, index) => ({ time: index / 10, open: 1 })) });
  assert.equal(track.frames.length, 10);
  assert.equal(track.frames[0].viseme, 'rest');
  assert.equal(track.frames[3].viseme, 'O');
  assert.equal(track.frames[8].viseme, 'rest');
  assert.equal(track.frames[3].round, 0.95);
  const json = speechTrackToJSON(track);
  assert.deepEqual(speechTrackFromJSON(json), json);
  assert.doesNotThrow(() => JSON.stringify(json));
});

test('each speech mouth is centered, front-facing, disposable, and clip-animatable', async () => {
  const track = {
    duration: 0.5,
    fps: 20,
    frames: [
      { time: 0, open: 0, wide: 0, round: 0, viseme: 'rest' },
      { time: 0.25, open: 0.8, wide: 0.9, round: 0.1, viseme: 'E' },
      { time: 0.5, open: 0.6, wide: 0.15, round: 0.95, viseme: 'O' },
    ],
  };
  const names = new Set();
  for (const mode of ['svg', 'cutout', 'jaw']) {
    const mouth = createSpeechMouth({ mode, width: 0.45, height: 0.22, depth: 0.12, skin: '#e9b58e' });
    await mouth.ready;
    assert.equal(mouth.object.position.length(), 0);
    assert.equal(mouth.object.userData.speechMode, mode);
    assert.ok(mouth.object.children.length >= 3);
    mouth.object.traverse((node) => {
      if (!node.isMesh) return;
      assert.ok(node.name.startsWith('SPEECH_MOUTH_'));
      assert.equal(names.has(node.name), false);
      names.add(node.name);
      assert.ok(node.position.z >= -0.0001 || mode === 'jaw');
    });
    const before = mouth.update(track.frames[1]);
    const stateBeforeClip = mouth.object.userData.speechFrame;
    const clip = mouth.createClip(track, `${mode}-speech`);
    assert.equal(clip.name, `${mode}-speech`);
    assert.equal(clip.duration, 0.5);
    assert.ok(clip.tracks.length > 0);
    if (mode === 'jaw') assert.equal(clip.tracks.some((track) => track.name.includes('.rotation[x]')), false);
    assert.deepEqual(mouth.object.userData.speechFrame, stateBeforeClip);
    assert.equal(mouth.update().viseme, 'rest');
    assert.notEqual(before.viseme, undefined);
    mouth.dispose();
    assert.equal(mouth.object.children.length, 0);
  }
});

