import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  COMPATIBLE_HUMANOID_BONES,
  COMPATIBLE_HUMANOID_RIG,
  createCompatibleHumanoidCopy,
  inspectCompatibleHumanoidSource,
  isEditableRetroCharacter,
} from '../src/modules/animation/compatible-humanoid-rig.js';
import {
  createSyntheticCompatibleSource,
  createSyntheticRetroCharacter,
  createSyntheticAvatarForgeCharacter,
} from './fixtures/compatible-humanoid-source.js';

function findSkinnedMesh(group) {
  let result = null;
  group.traverse((object) => {
    if (object.isSkinnedMesh) result = object;
  });
  return result;
}

function assertClose(actual, expected, epsilon = 1e-4) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

test('inspects the validated 24 bone Meshy profile and filters its pose clip', () => {
  const source = createSyntheticCompatibleSource();
  const report = inspectCompatibleHumanoidSource(source);

  assert.equal(report.ok, true);
  assert.equal(report.profile, COMPATIBLE_HUMANOID_RIG);
  assert.equal(report.boneCount, 24);
  assert.equal(report.weightedBoneCount, 22);
  assert.deepEqual(report.movingClips, ['Walking', 'Dance']);
  assert.equal(report.clips.find((clip) => clip.name === 'Pose').static, true);
  assert.equal(report.clips.find((clip) => clip.name === 'Walking').hipTranslation, true);
  assert.deepEqual(report.bones.slice(0, 6).map((bone) => bone.parent), [null, 'Hips', 'Spine02', 'Spine01', 'Spine', 'neck']);
  assert.equal(source.userData.animationClips.length, 3);
});

test('rejects missing hierarchy and animated scale before creating a partial result', () => {
  const missing = createSyntheticCompatibleSource();
  const sourceMesh = findSkinnedMesh(missing);
  sourceMesh.skeleton.getBoneByName('Spine01').parent = sourceMesh.skeleton.getBoneByName('Hips');
  assert.throws(() => inspectCompatibleHumanoidSource(missing), /jerarquía inválida.*Spine01/);

  const animatedScale = createSyntheticCompatibleSource({ animatedScale: true });
  assert.throws(() => inspectCompatibleHumanoidSource(animatedScale), /escala animada no soportada/);
});

test('ignores float noise on fixed positions but rejects real unsupported translation', () => {
  const noisy = createSyntheticCompatibleSource();
  noisy.userData.animationClips.find((clip) => clip.name === 'Walking').tracks.push(
    new THREE.VectorKeyframeTrack('headfront.position', [0, 1], [0, 0, 0, 0.000039577, 0, 0]),
  );
  assert.doesNotThrow(() => inspectCompatibleHumanoidSource(noisy));

  const movingUnsupported = createSyntheticCompatibleSource();
  movingUnsupported.userData.animationClips.find((clip) => clip.name === 'Walking').tracks.push(
    new THREE.VectorKeyframeTrack('LeftUpLeg.position', [0, 1], [0, 0, 0, 0.01, 0, 0]),
  );
  assert.throws(() => inspectCompatibleHumanoidSource(movingUnsupported), /solo se admite traslación animada de Hips/);
});

test('creates a separate weighted copy with exact bind pose, normalized influences and native clips', () => {
  const source = createSyntheticCompatibleSource();
  const retro = createSyntheticRetroCharacter();
  retro.position.set(3, 2, -4);
  retro.rotation.y = 0.22;
  retro.scale.set(1.15, 0.9, 1.05);
  retro.updateMatrixWorld(true);
  const originalArmRotation = retro.getObjectByName('ARM_L_UPPER').quaternion.clone();
  const originalSourceArmRotation = source.getObjectByName('LeftArm').quaternion.clone();

  assert.equal(isEditableRetroCharacter(retro), true);
  const result = createCompatibleHumanoidCopy(retro, source);
  const mesh = findSkinnedMesh(result);
  assert.ok(mesh);
  assert.equal(mesh.skeleton.bones.length, COMPATIBLE_HUMANOID_BONES.length);
  const leftShoulderLength = mesh.skeleton.getBoneByName('LeftShoulder').getWorldPosition(new THREE.Vector3())
    .distanceTo(mesh.skeleton.getBoneByName('LeftArm').getWorldPosition(new THREE.Vector3()));
  const rightShoulderLength = mesh.skeleton.getBoneByName('RightShoulder').getWorldPosition(new THREE.Vector3())
    .distanceTo(mesh.skeleton.getBoneByName('RightArm').getWorldPosition(new THREE.Vector3()));
  assert.ok(leftShoulderLength > 1e-4);
  assert.ok(rightShoulderLength > 1e-4);
  assert.equal(result.userData.nativeGltf, true);
  assert.equal(result.userData.compatibleRig, COMPATIBLE_HUMANOID_RIG);
  assert.equal('retroCharacterRecipe' in result.userData, false);
  assert.deepEqual(result.userData.sourceRetroCharacterRecipe, retro.userData.retroCharacterRecipe);
  assert.deepEqual(result.userData.animations.map((clip) => clip.name), ['Walking', 'Dance']);
  assert.deepEqual(result.userData.gltfAnimations.map((clip) => clip.name), ['Walking', 'Dance']);
  assert.equal(result.userData.animationClips[0] instanceof THREE.AnimationClip, true);
  assert.equal(mesh.material.vertexColors, true);

  const weights = mesh.geometry.getAttribute('skinWeight');
  for (let vertex = 0; vertex < weights.count; vertex += 1) {
    const sum = weights.getX(vertex) + weights.getY(vertex) + weights.getZ(vertex) + weights.getW(vertex);
    assertClose(sum, 1);
  }

  const positions = mesh.geometry.getAttribute('position');
  const bindPosition = new THREE.Vector3().fromBufferAttribute(positions, 0);
  const skinnedBindPosition = new THREE.Vector3();
  mesh.getVertexPosition(0, skinnedBindPosition);
  assertClose(skinnedBindPosition.x, bindPosition.x);
  assertClose(skinnedBindPosition.y, bindPosition.y);
  assertClose(skinnedBindPosition.z, bindPosition.z);

  assert.deepEqual(retro.getObjectByName('ARM_L_UPPER').quaternion.toArray(), originalArmRotation.toArray());
  assert.deepEqual(source.getObjectByName('LeftArm').quaternion.toArray(), originalSourceArmRotation.toArray());
  assert.deepEqual(result.position.toArray(), retro.position.toArray());
  assert.deepEqual(result.scale.toArray(), retro.scale.toArray());
});

test('transfers hip displacement and quaternion motion to the skinned copy', () => {
  const source = createSyntheticCompatibleSource();
  const retro = createSyntheticRetroCharacter();
  const result = createCompatibleHumanoidCopy(retro, source);
  const mesh = findSkinnedMesh(result);
  const hips = mesh.skeleton.getBoneByName('Hips');
  const arm = mesh.skeleton.getBoneByName('LeftArm');
  const initialHipY = hips.position.y;
  const initialArm = arm.quaternion.clone();
  const hipsIndex = mesh.skeleton.bones.indexOf(hips);
  let armVertex = -1;
  const skinIndices = mesh.geometry.getAttribute('skinIndex');
  const leftArmIndex = mesh.skeleton.bones.indexOf(arm);
  for (let vertex = 0; vertex < skinIndices.count; vertex += 1) {
    if (skinIndices.getX(vertex) === leftArmIndex) {
      armVertex = vertex;
      break;
    }
  }
  assert.ok(armVertex >= 0);
  const before = new THREE.Vector3();
  mesh.getVertexPosition(armVertex, before);

  const mixer = new THREE.AnimationMixer(result);
  mixer.clipAction(result.userData.animationClips.find((clip) => clip.name === 'Walking')).play();
  mixer.update(0.5);
  result.updateMatrixWorld(true);
  assert.notEqual(hips.position.y, initialHipY);
  assert.notDeepEqual(arm.quaternion.toArray(), initialArm.toArray());
  const after = new THREE.Vector3();
  mesh.getVertexPosition(armVertex, after);
  assert.ok(after.distanceTo(before) > 1e-4);
  assert.equal(hips.name, COMPATIBLE_HUMANOID_BONES[0]);
  assert.equal(mesh.skeleton.bones.indexOf(hips), hipsIndex);
});

test('keeps bind orientation from inverseBind when the donor is posed and the retro root is rotated', () => {
  const source = createSyntheticCompatibleSource();
  const sourceMesh = findSkinnedMesh(source);
  const posedArm = sourceMesh.skeleton.getBoneByName('LeftArm');
  posedArm.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.7));
  source.updateMatrixWorld(true);
  const retro = createSyntheticRetroCharacter();
  retro.rotation.set(0.15, 0.42, -0.1);
  retro.updateMatrixWorld(true);
  const result = createCompatibleHumanoidCopy(retro, source);
  const resultMesh = findSkinnedMesh(result);
  const sourceBoneIndex = sourceMesh.skeleton.bones.indexOf(posedArm);
  const bindArmQuaternion = new THREE.Quaternion();
  new THREE.Matrix4().copy(sourceMesh.skeleton.boneInverses[sourceBoneIndex]).invert()
    .decompose(new THREE.Vector3(), bindArmQuaternion, new THREE.Vector3());
  const sourceParent = sourceMesh.skeleton.getBoneByName('LeftShoulder');
  const parentIndex = sourceMesh.skeleton.bones.indexOf(sourceParent);
  const bindParentQuaternion = new THREE.Quaternion();
  new THREE.Matrix4().copy(sourceMesh.skeleton.boneInverses[parentIndex]).invert()
    .decompose(new THREE.Vector3(), bindParentQuaternion, new THREE.Vector3());
  const expectedLocal = bindParentQuaternion.invert().multiply(bindArmQuaternion).normalize();
  const resultArm = resultMesh.skeleton.getBoneByName('LeftArm');
  assertClose(resultArm.quaternion.x, expectedLocal.x);
  assertClose(resultArm.quaternion.y, expectedLocal.y);
  assertClose(resultArm.quaternion.z, expectedLocal.z);
  assertClose(resultArm.quaternion.w, expectedLocal.w);
  assert.ok(resultArm.quaternion.angleTo(posedArm.quaternion) > 0.1);

  const hipTrack = result.userData.animationClips
    .find((clip) => clip.name === 'Walking')
    .tracks.find((track) => track.name === 'Hips.position');
  assert.ok(hipTrack);
  assertClose(hipTrack.values[0], resultMesh.skeleton.getBoneByName('Hips').position.x);
  assertClose(hipTrack.values[1], resultMesh.skeleton.getBoneByName('Hips').position.y);
  assertClose(hipTrack.values[2], resultMesh.skeleton.getBoneByName('Hips').position.z);
  assert.ok(hipTrack.values[4] > hipTrack.values[1]);
});

test('preserves Hips STEP interpolation while retargeting its displacement', () => {
  const source = createSyntheticCompatibleSource();
  const sourceHipTrack = source.userData.animationClips.find((clip) => clip.name === 'Walking').tracks
    .find((track) => track.name === 'Hips.position');
  sourceHipTrack.setInterpolation(THREE.InterpolateDiscrete);
  const result = createCompatibleHumanoidCopy(createSyntheticRetroCharacter(), source);
  const outputHipTrack = result.userData.animationClips.find((clip) => clip.name === 'Walking').tracks
    .find((track) => track.name === 'Hips.position');
  assert.equal(outputHipTrack.getInterpolation(), THREE.InterpolateDiscrete);
});

test('binds nested facial detail groups to their nearest real head joint', () => {
  const source = createSyntheticCompatibleSource();
  const retro = createSyntheticRetroCharacter();
  const detail = new THREE.Group(); detail.name = 'HEAD_NOSE';
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: '#ee7700' }));
  detail.add(nose); retro.getObjectByName('HEAD').add(detail);
  const result = createCompatibleHumanoidCopy(retro, source);
  const mesh = findSkinnedMesh(result), joints = mesh.geometry.attributes.skinIndex;
  const headIndex = mesh.skeleton.bones.findIndex(b => b.name === 'Head');
  assert.ok(Array.from({ length: joints.count }, (_, i) => joints.getX(i)).includes(headIndex));
  assert.ok(result.userData.geometryStats.triangleCount > 12);
});


test('accepts Avatar Forge HUMANOID_STANDARD through semantic slot aliases and preserves head decals', () => {
  const source = createSyntheticCompatibleSource();
  const avatar = createSyntheticAvatarForgeCharacter();
  const originalRecipe = JSON.parse(JSON.stringify(avatar.userData.avatarRecipe));
  const originalFace = avatar.getObjectByName('FACE_DECAL');
  const originalChildren = avatar.children.length;

  assert.equal(avatar.getObjectByName('CHEST'), undefined);
  assert.equal(isEditableRetroCharacter(avatar), true);

  const result = createCompatibleHumanoidCopy(avatar, source);
  const mesh = findSkinnedMesh(result);
  const decal = result.getObjectByName('FACE_DECAL');

  assert.ok(mesh);
  assert.equal(mesh.skeleton.bones.length, COMPATIBLE_HUMANOID_BONES.length);
  assert.ok(decal);
  assert.equal(decal.parent.name, 'Head');
  assert.ok(decal.geometry.attributes.uv);
  assert.notEqual(decal.geometry, originalFace.geometry);
  assert.notEqual(decal.material, originalFace.material);
  assert.notEqual(decal.material.map, originalFace.material.map);
  assert.equal(decal.material.transparent, true);
  assert.equal(decal.material.alphaTest, 0.1);
  assert.equal(decal.material.depthWrite, false);
  assert.equal(decal.matrixAutoUpdate, true);
  assert.ok(Number.isFinite(decal.position.x) && Number.isFinite(decal.position.y) && Number.isFinite(decal.position.z));
  assert.equal(result.userData.sourceCompatibleTargetKind, 'avatar-forge');
  assert.deepEqual(result.userData.sourceAvatarRecipe, originalRecipe);
  assert.equal('avatarRecipe' in result.userData, false);
  assert.equal(result.userData.sourceRetroCharacterRecipe, null);
  assert.equal(result.userData.geometryStats.headSurfaceCount, 1);
  assert.equal(result.userData.skeletonId, COMPATIBLE_HUMANOID_RIG);
  assert.deepEqual(result.userData.boneNames, COMPATIBLE_HUMANOID_BONES);
  assert.deepEqual(avatar.userData.avatarRecipe, originalRecipe);
  assert.equal(avatar.children.length, originalChildren);
  assert.equal(avatar.getObjectByName('FACE_DECAL'), originalFace);
  assert.equal(originalFace.parent.name, 'HEAD');
});

test('aligns Avatar Forge facing and anatomical sides while moving preserved decals with Head', () => {
  const source = createSyntheticCompatibleSource();
  const walking = source.userData.animationClips.find((clip) => clip.name === 'Walking');
  const sourceHead = source.getObjectByName('Head');
  const headStart = sourceHead.quaternion.clone();
  const headEnd = headStart.clone().multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.55),
  );
  walking.tracks.push(new THREE.QuaternionKeyframeTrack(
    'Head.quaternion',
    [0, 1],
    [
      headStart.x, headStart.y, headStart.z, headStart.w,
      headEnd.x, headEnd.y, headEnd.z, headEnd.w,
    ],
  ));

  const result = createCompatibleHumanoidCopy(createSyntheticAvatarForgeCharacter(), source);
  const mesh = findSkinnedMesh(result);
  const decal = result.getObjectByName('FACE_DECAL');
  const leftTarget = mesh.skeleton.getBoneByName('LeftArm').getWorldPosition(new THREE.Vector3());
  const rightTarget = mesh.skeleton.getBoneByName('RightArm').getWorldPosition(new THREE.Vector3());
  const sourceLeft = source.getObjectByName('LeftArm').getWorldPosition(new THREE.Vector3());

  assert.ok(sourceLeft.x > 0);
  assert.ok(leftTarget.x > rightTarget.x);
  assert.ok(leftTarget.x > 0);
  const head = mesh.skeleton.getBoneByName('Head').getWorldPosition(new THREE.Vector3());
  const front = mesh.skeleton.getBoneByName('headfront').getWorldPosition(new THREE.Vector3()).sub(head);
  assert.ok(front.z > 0, 'Forge default scene front must agree with the animation rig');

  result.updateMatrixWorld(true);
  const before = decal.getWorldPosition(new THREE.Vector3());
  const mixer = new THREE.AnimationMixer(result);
  mixer.clipAction(result.userData.animationClips.find((clip) => clip.name === 'Walking')).play();
  mixer.update(0.5);
  result.updateMatrixWorld(true);
  const after = decal.getWorldPosition(new THREE.Vector3());
  assert.ok(after.distanceTo(before) > 1e-4);
});

test('rejects textured Avatar Forge pieces outside the head without mutating the source', () => {
  const source = createSyntheticCompatibleSource();
  const avatar = createSyntheticAvatarForgeCharacter({ outsideTexture: true });
  const originalChildren = avatar.children.length;
  const originalPiece = avatar.getObjectByName('outside_textured_piece');

  assert.equal(isEditableRetroCharacter(avatar), true);
  assert.throws(
    () => createCompatibleHumanoidCopy(avatar, source),
    /fuera de la cabeza/,
  );
  assert.equal(avatar.children.length, originalChildren);
  assert.equal(avatar.getObjectByName('outside_textured_piece'), originalPiece);
  assert.equal(originalPiece.material.map.isTexture, true);
});

test('rejects Avatar Forge metadata with missing standard anchors before creating a copy', () => {
  const source = createSyntheticCompatibleSource();
  const avatar = createSyntheticAvatarForgeCharacter();
  const shoulder = avatar.getObjectByName('Left_Shoulder');
  shoulder.parent.remove(shoulder);

  assert.equal(isEditableRetroCharacter(avatar), false);
  assert.throws(
    () => createCompatibleHumanoidCopy(avatar, source),
    /Avatar Forge.*faltan/,
  );
});

