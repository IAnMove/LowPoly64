import test from 'node:test';
import assert from 'node:assert/strict';
import { rhubarbResultToSpeechTrack } from '../src/modules/character-studio/speech/rhubarb-adapter.js';
import { framesFromCues, speechTrackToJSON, speechTrackFromJSON } from '../src/modules/character-studio/speech/speech-core.js';

const automatic = () => rhubarbResultToSpeechTrack({ mouthCues: [{ start: 0, end: .2, value: 'A' }, { start: .2, end: .8, value: 'D' }] });

test('saved automatic gestures retain their source, recognizer and original cues without aliasing', () => {
  const source = automatic();
  const saved = speechTrackToJSON(source);
  const reopened = speechTrackFromJSON(JSON.parse(JSON.stringify(saved)));
  assert.equal(reopened.source, 'rhubarb');
  assert.equal(reopened.recognizer, 'phonetic');
  assert.deepEqual(reopened, saved);
  assert.equal(reopened.rhubarbCues[0].shape, 'A');
  assert.equal(reopened.rhubarbCues[0].viseme, 'M');
  source.rhubarbCues[0].start = .1;
  assert.equal(saved.rhubarbCues[0].start, 0);
});

test('legacy tracks remain importable without inventing an analysis source', () => {
  const source = framesFromCues([{ start: 0, end: .3, viseme: 'O' }]);
  const saved = speechTrackToJSON(source);
  assert.deepEqual(speechTrackFromJSON(saved), saved);
  assert.equal('source' in saved, false);
  assert.equal('rhubarbCues' in saved, false);
});

test('incomplete or invalid automatic gesture metadata fails before a track can replace current work', () => {
  const valid = speechTrackToJSON(automatic());
  for (const change of [
    { source: 'unknown' }, { recognizer: '' }, { rhubarbCues: null },
    { rhubarbCues: [{ start: -.1, end: .3, shape: 'A', viseme: 'M' }] },
    { rhubarbCues: [{ start: 0, end: 0, shape: 'A', viseme: 'M' }] },
    { rhubarbCues: [{ start: 0, end: .3, shape: 'Z', viseme: 'M' }] },
    { rhubarbCues: [{ start: 0, end: .3, shape: 'A', viseme: 'O' }] },
  ]) assert.throws(() => speechTrackFromJSON({ ...valid, ...change }), /speech track|rhubarbCues/);
  const partial = { ...valid }; delete partial.recognizer;
  assert.throws(() => speechTrackFromJSON(partial), /must contain/);
});
