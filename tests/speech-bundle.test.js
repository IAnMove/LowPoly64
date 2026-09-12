import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createSpeechBundle } from '../src/modules/character-studio/speech/speech-bundle.js';

test('portable bundle keeps independent audio, video, recipe and facial motion with a readable manifest', async () => {
  const track = { version: 1, fps: 30, duration: 1, frames: [{ time: 0, open: 0 }, { time: .5, open: .7, wide: .4, round: .2 }, { time: 1, open: 0 }] };
  const bundle = await createSpeechBundle({ model: new Uint8Array([1, 2, 3]), track,
    audio: new Blob(['voice'], { type: 'audio/mp4' }), video: new Blob(['movie'], { type: 'video/mp4' }),
    character: 'Prueba', mode: 'jaw', recipe: { version: 1, name: 'Prueba' }, stage: { view: 'scene' },
    background: new Blob(['pixels'], { type: 'image/png' }),
  });
  const zip = await JSZip.loadAsync(await bundle.arrayBuffer());
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.animationClip, 'speech'); assert.equal(manifest.audio, 'voice.mp4'); assert.equal(manifest.video, 'performance.mp4');
  assert.equal(manifest.playback.audioEmbeddedInGLB, false); assert.equal(manifest.compatibility.hocuspocus, 'unverified');
  assert.deepEqual([...await zip.file(manifest.model).async('uint8array')], [1, 2, 3]);
  assert.equal(await zip.file(manifest.audio).async('string'), 'voice');
  assert.equal(JSON.parse(await zip.file(manifest.speechTrack).async('string')).frames.at(-1).open, 0);
  assert.equal(JSON.parse(await zip.file(manifest.recipe).async('string')).name, 'Prueba');
  assert.ok(zip.file('background.png')); assert.match(await zip.file('LEEME.txt').async('string'), /Hocuspocus/);
});

test('silent model export does not invent audio or video filenames', async () => {
  const bundle = await createSpeechBundle({ model: new Uint8Array([0]), character: 'Silencio', mode: 'svg', track: { duration: 1, frames: [{ time: 0 }, { time: 1 }] } });
  const zip = await JSZip.loadAsync(await bundle.arrayBuffer());
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  assert.equal(manifest.audio, null); assert.equal(manifest.video, null); assert.equal(manifest.recipe, null);
  assert.equal(Object.keys(zip.files).length, 4);
});
