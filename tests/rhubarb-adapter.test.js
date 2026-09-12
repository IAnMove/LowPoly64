import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RHUBARB_SHAPE_TO_VISEME,
  isRhubarbShape,
  rhubarbResultToSpeechCues,
  rhubarbResultToSpeechTrack,
} from '../src/modules/character-studio/speech/rhubarb-adapter.js';

test('maps every Rhubarb A-H/X shape to the public viseme contract', () => {
  assert.deepEqual(RHUBARB_SHAPE_TO_VISEME, { X: 'rest', A: 'M', B: 'I', C: 'E', D: 'A', E: 'O', F: 'U', G: 'F', H: 'E' });
  for (const shape of Object.keys(RHUBARB_SHAPE_TO_VISEME)) assert.equal(isRhubarbShape(shape.toLowerCase()), true);
  assert.equal(isRhubarbShape('Z'), false);
  const cues = rhubarbResultToSpeechCues({ mouthCues: Object.keys(RHUBARB_SHAPE_TO_VISEME).map((shape, i) => ({ start: i, end: i + 0.5, value: shape })) });
  assert.deepEqual(cues.cues.map(cue => cue.viseme), ['rest', 'M', 'I', 'E', 'A', 'O', 'U', 'F', 'E']);
});

test('accepts JSON strings, sorts cues, and derives duration from metadata or cue ends', () => {
  const result = rhubarbResultToSpeechCues(JSON.stringify({ metadata: { duration: 1.25 }, cues: [
    { start: 0.8, end: 1.1, value: 'D' }, { start: 0, end: 0.2, shape: 'A' },
  ] }));
  assert.equal(result.duration, 1.25);
  assert.deepEqual(result.cues.map(({ start, shape }) => ({ start, shape })), [{ start: 0, shape: 'A' }, { start: 0.8, shape: 'D' }]);
  assert.equal(rhubarbResultToSpeechCues({ cues: [{ start: 0, end: 2, value: 'X' }], duration: 1 }).duration, 2);
});

test('rejects malformed results and invalid cue timing/shapes with stable error codes', () => {
  for (const input of ['{bad', null, [], {}, { cues: [{ start: 0, end: 1, value: 'Z' }] }, { cues: [{ start: 1, end: 1, value: 'A' }] }]) {
    assert.throws(() => rhubarbResultToSpeechCues(input), error => error.code === 'INVALID_RHUBARB_RESULT');
  }
  assert.throws(() => rhubarbResultToSpeechCues({ metadata: { duration: -1 }, cues: [] }), /duration/);
});

test('normalizes overlapping cues into deterministic frames and preserves track duration', () => {
  const track = rhubarbResultToSpeechTrack({ cues: [
    { start: 0.5, end: 1.1, value: 'E' }, { start: 0, end: 0.5, value: 'A' },
  ], metadata: { duration: 1.4 } }, { duration: 1.4, fps: 10, frames: Array.from({ length: 14 }, (_, i) => ({ time: i / 10, open: 1 })) });
  assert.equal(track.duration, 1.4);
  assert.equal(track.frames.length, 14);
  assert.equal(track.frames[0].viseme, 'M');
  assert.equal(track.frames[5].viseme, 'O');
  assert.equal(track.frames[12].viseme, 'rest');
  assert.deepEqual(track.rhubarbCues.map(cue => cue.shape), ['A', 'E']);
});
