import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { compileAnimation, splitRootTracksForPlayback } from '../src/modules/animation/animation.js';

function buildProp() {
  const group = new THREE.Group();
  group.userData.name = 'Silla';
  group.name = 'Silla';
  const seat = new THREE.Group();
  seat.userData.name = 'SEAT';
  seat.name = 'SEAT';
  seat.position.set(0, 1, 0);
  group.add(seat);
  return { group, seat };
}

const IDLE = {
  name: 'idle',
  duration: 2,
  loop: true,
  tracks: [
    { target: 'Silla', property: 'position', keyframes: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [0, 0.2, 0] }, { time: 2, value: [0, 0, 0] }] },
    { target: 'Silla', property: 'rotation', keyframes: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [0, 0, 0.1] }, { time: 2, value: [0, 0, 0] }] },
    { target: 'SEAT', property: 'position', keyframes: [{ time: 0, value: [0, 1, 0] }, { time: 1, value: [0, 1.5, 0] }, { time: 2, value: [0, 1, 0] }] },
  ],
};

test('root tracks become an additive clip and part tracks stay absolute', () => {
  const { group } = buildProp();
  const clip = compileAnimation(IDLE, group);
  const { partClip, rootClip } = splitRootTracksForPlayback(clip, group);
  assert.equal(rootClip.blendMode, THREE.AdditiveAnimationBlendMode);
  assert.deepEqual(rootClip.tracks.map((track) => track.name).sort(), ['Silla.position', 'Silla.rotation[x]', 'Silla.rotation[y]', 'Silla.rotation[z]']);
  assert.deepEqual(partClip.tracks.map((track) => track.name), ['SEAT.position']);
  assert.equal(rootClip.duration, clip.duration);
  // The source clip is not mutated by makeClipAdditive.
  const source = Array.from(clip.tracks.find((track) => track.name === 'Silla.position').values);
  [0, 0, 0, 0, 0.2, 0, 0, 0, 0].forEach((expected, index) => assert.ok(Math.abs(source[index] - expected) < 1e-6));
});

test('playing a whole-object clip keeps the object where the user placed it', () => {
  const { group, seat } = buildProp();
  const clip = compileAnimation(IDLE, group);
  group.position.set(6, 0, -4);
  group.rotation.set(0, Math.PI / 2, 0);

  const mixer = new THREE.AnimationMixer(group);
  const { partClip, rootClip } = splitRootTracksForPlayback(clip, group);
  for (const entry of [partClip, rootClip]) mixer.clipAction(entry).play();

  mixer.update(1);
  assert.ok(Math.abs(group.position.x - 6) < 1e-6);
  assert.ok(Math.abs(group.position.y - 0.2) < 1e-6);
  assert.ok(Math.abs(group.position.z + 4) < 1e-6);
  assert.ok(Math.abs(group.rotation.y - Math.PI / 2) < 1e-6, 'user yaw is preserved');
  assert.ok(Math.abs(group.rotation.z - 0.1) < 1e-6);
  assert.ok(Math.abs(seat.position.y - 1.5) < 1e-6, 'part tracks remain absolute');

  mixer.stopAllAction();
  assert.deepEqual(group.position.toArray(), [6, 0, -4]);
  assert.ok(Math.abs(group.rotation.y - Math.PI / 2) < 1e-6);
});

test('clips without root tracks are returned unchanged', () => {
  const { group } = buildProp();
  const clip = compileAnimation({ ...IDLE, tracks: [IDLE.tracks[2]] }, group);
  const { partClip, rootClip } = splitRootTracksForPlayback(clip, group);
  assert.equal(partClip, clip);
  assert.equal(rootClip, null);
});
