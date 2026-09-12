import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { serializeNativeGltfGroup, deserializeNativeGltfGroup } from '../src/modules/viewport/native-gltf.js';

test('native snapshots persist changed and removed clips instead of the import cache', async () => {
  const group = new THREE.Group();
  group.name = 'Native';
  const bone = new THREE.Bone(); bone.name = 'Hips'; group.add(bone);
  const clip = new THREE.AnimationClip('Walking', 1, [new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [0, 1, 0, 0, 2, 0])]);
  group.userData.nativeGltf = true;
  group.userData.gltfAnimations = [THREE.AnimationClip.toJSON(clip)];
  group.userData.animationClips = [clip];
  clip.name = 'Edited walking'; clip.tracks[0].values[4] = 3;
  const restored = await deserializeNativeGltfGroup(serializeNativeGltfGroup(group));
  assert.equal(restored.userData.animationClips[0].name, 'Edited walking');
  assert.equal(restored.userData.animationClips[0].tracks[0].values[4], 3);
  group.userData.animationClips.length = 0;
  assert.deepEqual(serializeNativeGltfGroup(group).clips, []);
});
