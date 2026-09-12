import * as THREE from 'three';

export const SYNTHETIC_SOURCE_BONES = Object.freeze([
  'Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
]);

const PARENT = Object.freeze({
  Hips: null,
  Spine02: 'Hips', Spine01: 'Spine02', Spine: 'Spine01',
  neck: 'Spine', Head: 'neck', head_end: 'Head', headfront: 'Head',
  LeftShoulder: 'Spine', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
  RightShoulder: 'Spine', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
  LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
  RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot',
});

const LOCAL_POSITION = Object.freeze({
  Hips: [0, 1, 0],
  Spine02: [0, 0.35, 0], Spine01: [0, 0.35, 0], Spine: [0, 0.3, 0],
  neck: [0, 0.2, 0], Head: [0, 0.2, 0], head_end: [0, 0.35, 0], headfront: [0, 0, 0.2],
  LeftShoulder: [0.3, 0, 0], LeftArm: [0.3, 0, 0], LeftForeArm: [0.3, 0, 0], LeftHand: [0.2, 0, 0],
  RightShoulder: [-0.3, 0, 0], RightArm: [-0.3, 0, 0], RightForeArm: [-0.3, 0, 0], RightHand: [-0.2, 0, 0],
  LeftUpLeg: [0.22, -0.2, 0], LeftLeg: [0, -0.48, 0], LeftFoot: [0, -0.38, 0.08], LeftToeBase: [0, 0, 0.18],
  RightUpLeg: [-0.22, -0.2, 0], RightLeg: [0, -0.48, 0], RightFoot: [0, -0.38, 0.08], RightToeBase: [0, 0, 0.18],
});

function makeQuaternion(bone, angle = 0) {
  const quaternion = new THREE.Quaternion();
  if (angle) quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  return quaternion;
}

function makeBoneHierarchy() {
  const root = new THREE.Group();
  root.name = 'SyntheticMeshySource';
  const bones = [];
  const byName = new Map();
  SYNTHETIC_SOURCE_BONES.forEach((name, index) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.userData.name = name;
    bone.position.fromArray(LOCAL_POSITION[name]);
    if (name === 'Hips') bone.quaternion.copy(makeQuaternion(bone, 0.12));
    if (name === 'LeftArm' || name === 'RightArm') bone.quaternion.copy(makeQuaternion(bone, name.startsWith('Left') ? 0.08 : -0.08));
    const parentName = PARENT[name];
    if (parentName) byName.get(parentName).add(bone);
    else root.add(bone);
    bones.push(bone);
    byName.set(name, bone);
    // Ensure deterministic construction even when a future fixture adds a bone.
    bone.userData.fixtureIndex = index;
  });
  root.updateMatrixWorld(true);
  return { root, bones, byName };
}

function createSourceMesh(bones) {
  const geometry = new THREE.BoxGeometry(0.9, 1.8, 0.55);
  const vertexCount = geometry.getAttribute('position').count;
  const weightedIndices = bones
    .map((bone, index) => ({ bone, index }))
    .filter(({ bone }) => bone.name !== 'head_end' && bone.name !== 'headfront')
    .map(({ index }) => index);
  const skinIndices = [];
  const skinWeights = [];
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const boneIndex = weightedIndices[vertex % weightedIndices.length];
    skinIndices.push(boneIndex, 0, 0, 0);
    skinWeights.push(1, 0, 0, 0);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  const material = new THREE.MeshBasicMaterial({ color: 0x78a9d4 });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'SyntheticMeshyMesh';
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  mesh.bind(skeleton, new THREE.Matrix4());
  return { mesh, skeleton };
}

function quaternionValues(quaternion) {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function makeClips(byName) {
  const hips = byName.get('Hips');
  const arm = byName.get('LeftArm');
  const hipsQ = quaternionValues(hips.quaternion);
  const armQ = quaternionValues(arm.quaternion);
  const raisedArm = arm.quaternion.clone().multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.55),
  );
  const pose = new THREE.AnimationClip('Pose', 0, [
    new THREE.QuaternionKeyframeTrack('Hips.quaternion', [0], hipsQ),
    new THREE.VectorKeyframeTrack('Hips.scale', [0], [1, 1, 1]),
  ]);
  const walking = new THREE.AnimationClip('Walking', 1.0, [
    new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [0, 1, 0, 0, 1.28, 0]),
    new THREE.QuaternionKeyframeTrack('Hips.quaternion', [0, 1], [...hipsQ, ...hipsQ]),
    new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', [0, 1], [...armQ, ...quaternionValues(raisedArm)]),
    new THREE.VectorKeyframeTrack('Hips.scale', [0, 1], [1, 1, 1, 1, 1, 1]),
  ]);
  const dance = new THREE.AnimationClip('Dance', 1.5, [
    new THREE.QuaternionKeyframeTrack('RightArm.quaternion', [0, 0.75, 1.5], [0, 0, 0, 1, 0, 0.25, 0, 0.9682458, 0, 0, 0, 1]),
  ]);
  return [pose, walking, dance];
}

export function createSyntheticCompatibleSource({ animatedScale = false } = {}) {
  const { root, bones, byName } = makeBoneHierarchy();
  const { mesh, skeleton } = createSourceMesh(bones);
  root.add(mesh);
  const clips = makeClips(byName);
  if (animatedScale) {
    clips.push(new THREE.AnimationClip('BadScale', 1, [
      new THREE.VectorKeyframeTrack('Hips.scale', [0, 1], [1, 1, 1, 1.2, 1, 1]),
    ]));
  }
  root.userData.animationClips = clips;
  root.userData.nativeGltf = true;
  root.userData.fixtureSkeleton = skeleton;
  root.updateMatrixWorld(true);
  return root;
}

function addPivot(parent, name, position) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.userData.name = name;
  pivot.position.fromArray(position);
  parent.add(pivot);
  return pivot;
}

function addBox(parent, name, size, position, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.name = name;
  mesh.userData.name = name;
  mesh.position.fromArray(position);
  parent.add(mesh);
  return mesh;
}

export function createSyntheticRetroCharacter() {
  const root = new THREE.Group();
  root.name = 'Synthetic Retro Character';
  root.userData = {
    isRetroCharacter: true,
    humanoidRigMode: 'canonical',
    retroCharacterRecipe: {
      format: 'retrovisor-character',
      version: 1,
      label: 'Synthetic Retro Character',
      style: 'n64',
      headStyle: 'n64',
      includeHead: true,
      headScale: 1,
      bodyHeight: 2.8,
      bodyWidth: 0.9,
      colors: { skin: '#d8a78f', hair: '#35261f', shirt: '#2b66ac', pants: '#29384f', shoes: '#17202b' },
      hair: 'short',
    },
  };
  const pelvis = addPivot(root, 'PELVIS', [0, 1.0, 0]);
  const torso = addPivot(pelvis, 'TORSO', [0, 0.45, 0]);
  const chest = addPivot(torso, 'CHEST', [0, 0.6, 0]);
  const neck = addPivot(chest, 'NECK', [0, 0.3, 0]);
  const head = addPivot(neck, 'HEAD', [0, 0.2, 0]);
  addBox(pelvis, 'pelvis_mesh', [0.65, 0.35, 0.45], [0, 0, 0], 0x29384f);
  addBox(torso, 'torso_mesh', [0.85, 0.9, 0.42], [0, 0, 0], 0x2b66ac);
  addBox(neck, 'neck_mesh', [0.2, 0.25, 0.2], [0, 0, 0], 0xd8a78f);
  addBox(head, 'head_mesh', [0.55, 0.65, 0.5], [0, 0.3, 0], 0xd8a78f);
  addBox(head, 'hair_mesh', [0.6, 0.18, 0.55], [0, 0.63, -0.01], 0x35261f);
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    const clavicle = addPivot(chest, `CLAVICLE_${side}`, [sign * 0.5, 0.18, 0]);
    const upper = addPivot(clavicle, `ARM_${side}_UPPER`, [0, 0, 0]);
    const lower = addPivot(upper, `ARM_${side}_LOWER`, [0, -0.37, 0]);
    const hand = addPivot(lower, `HAND_${side}`, [0, -0.34, 0]);
    addBox(upper, `upper_arm_${side}`, [0.22, 0.38, 0.22], [0, -0.18, 0], 0x2b66ac);
    addBox(lower, `lower_arm_${side}`, [0.2, 0.36, 0.2], [0, -0.18, 0], 0xd8a78f);
    addBox(hand, `hand_${side}`, [0.25, 0.2, 0.25], [0, -0.1, 0], 0xd8a78f);
    const upperLeg = addPivot(pelvis, `LEG_${side}_UPPER`, [sign * 0.22, -0.18, 0]);
    const lowerLeg = addPivot(upperLeg, `LEG_${side}_LOWER`, [0, -0.48, 0]);
    const foot = addPivot(lowerLeg, `FOOT_${side}`, [0, -0.36, 0.08]);
    addBox(upperLeg, `upper_leg_${side}`, [0.25, 0.4, 0.27], [0, -0.2, 0], 0x29384f);
    addBox(lowerLeg, `lower_leg_${side}`, [0.21, 0.42, 0.23], [0, -0.2, 0], 0x29384f);
    addBox(foot, `foot_${side}`, [0.32, 0.18, 0.5], [0, -0.09, 0.12], 0x17202b);
  }
  root.updateMatrixWorld(true);
  return root;
}

function makeAvatarPivot(parent, name, position) {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.userData.name = name;
  pivot.position.fromArray(position);
  parent.add(pivot);
  return pivot;
}

function makeAvatarMesh(parent, name, geometry, material, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.fromArray(position);
  parent.add(mesh);
  return mesh;
}

function createAvatarSurfaceTexture() {
  const pixels = new Uint8Array([
    255, 32, 32, 255,
    255, 32, 32, 96,
  ]);
  const texture = new THREE.DataTexture(pixels, 1, 2, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.flipY = false;
  return texture;
}

function createAvatarSlotBindings() {
  return {
    HEAD: ['Head', 'HEAD'],
    TORSO: ['Hips', 'Spine', 'Neck', 'PELVIS', 'TORSO', 'NECK'],
    ARM_L: ['Left_Shoulder', 'Left_Upper_Arm', 'Left_Lower_Arm', 'Left_Hand', 'CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L', 'ARM_L', 'ARM_L_FOREARM'],
    ARM_R: ['Right_Shoulder', 'Right_Upper_Arm', 'Right_Lower_Arm', 'Right_Hand', 'CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R', 'ARM_R', 'ARM_R_FOREARM'],
    LEG_L: ['Left_Upper_Leg', 'Left_Lower_Leg', 'Left_Foot', 'LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L', 'LEG_L', 'LEG_L_SHIN'],
    LEG_R: ['Right_Upper_Leg', 'Right_Lower_Leg', 'Right_Foot', 'LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R', 'LEG_R', 'LEG_R_SHIN'],
  };
}

export function createSyntheticAvatarForgeCharacter({ outsideTexture = false } = {}) {
  const root = new THREE.Group();
  root.name = 'Synthetic Avatar Forge';
  root.rotation.y = Math.PI; // The app presents its internal -Z Forge molds toward +Z.
  const slotBindings = createAvatarSlotBindings();
  root.userData = {
    name: root.name,
    archetype: 'HUMANOID',
    humanoidRigMode: 'standard',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    skeletonId: 'HUMANOID_STANDARD',
    slotMap: Object.fromEntries(Object.entries(slotBindings).map(([key, values]) => [key, [...values]])),
    slotBindings,
    avatarRecipe: {
      version: 1,
      label: root.name,
      bodyPresetId: 'psx_humanoid_chibi_mold_cm',
      headMoldId: 'gen_head_chibi',
      skeletonId: 'HUMANOID_STANDARD',
      animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
      features: {
        eyes: { presetId: 'wide_01' },
        brows: { presetId: 'soft_01' },
        mouth: { presetId: 'smile_01' },
      },
    },
  };

  const hips = makeAvatarPivot(root, 'Hips', [0, 1.0, 0]);
  const pelvis = makeAvatarPivot(hips, 'PELVIS', [0, 0, 0]);
  const spine = makeAvatarPivot(hips, 'Spine', [0, 0.55, 0]);
  const torso = makeAvatarPivot(spine, 'TORSO', [0, 0, 0]);
  const neck = makeAvatarPivot(spine, 'Neck', [0, 0.28, 0]);
  const neckAnchor = makeAvatarPivot(neck, 'NECK', [0, -0.12, 0]);
  const head = makeAvatarPivot(neck, 'Head', [0, 0.28, 0]);
  const headAnchor = makeAvatarPivot(head, 'HEAD', [0, 0, 0]);

  makeAvatarMesh(pelvis, 'avatar_pelvis', new THREE.BoxGeometry(0.8, 0.35, 0.45), new THREE.MeshBasicMaterial({ color: 0x334466 }), [0, -0.02, 0]);
  makeAvatarMesh(torso, 'avatar_torso', new THREE.BoxGeometry(1.0, 0.8, 0.45), new THREE.MeshBasicMaterial({ color: 0x6688aa }), [0, 0.02, 0]);
  makeAvatarMesh(neckAnchor, 'avatar_neck', new THREE.BoxGeometry(0.22, 0.25, 0.2), new THREE.MeshBasicMaterial({ color: 0xd9aa88 }), [0, 0, 0]);
  makeAvatarMesh(headAnchor, 'avatar_head', new THREE.BoxGeometry(0.75, 0.75, 0.6), new THREE.MeshBasicMaterial({ color: 0xd9aa88 }), [0, 0.12, 0]);

  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1;
    const prefix = side === 'L' ? 'Left' : 'Right';
    const shoulder = makeAvatarPivot(spine, prefix + '_Shoulder', [sign * 0.62, 0, 0]);
    const upper = makeAvatarPivot(shoulder, prefix + '_Upper_Arm', [sign * 0.28, 0, 0]);
    const lower = makeAvatarPivot(upper, prefix + '_Lower_Arm', [0, -0.42, 0]);
    const hand = makeAvatarPivot(lower, prefix + '_Hand', [0, -0.38, 0]);
    const armPivot = makeAvatarPivot(upper, 'ARM_' + side, [0, 0, 0]);
    const forearmPivot = makeAvatarPivot(lower, 'ARM_' + side + '_FOREARM', [0, 0, 0]);
    const handPivot = makeAvatarPivot(hand, 'HAND_' + side, [0, 0, 0]);
    makeAvatarMesh(armPivot, 'avatar_upper_arm_' + side, new THREE.BoxGeometry(0.22, 0.42, 0.22), new THREE.MeshBasicMaterial({ color: 0x6688aa }), [0, -0.2, 0]);
    makeAvatarMesh(forearmPivot, 'avatar_lower_arm_' + side, new THREE.BoxGeometry(0.2, 0.38, 0.2), new THREE.MeshBasicMaterial({ color: 0xd9aa88 }), [0, -0.19, 0]);
    makeAvatarMesh(handPivot, 'avatar_hand_' + side, new THREE.BoxGeometry(0.25, 0.2, 0.25), new THREE.MeshBasicMaterial({ color: 0xd9aa88 }), [0, -0.1, 0]);

    const upperLeg = makeAvatarPivot(hips, prefix + '_Upper_Leg', [sign * 0.25, -0.18, 0]);
    const lowerLeg = makeAvatarPivot(upperLeg, prefix + '_Lower_Leg', [0, -0.48, 0]);
    const foot = makeAvatarPivot(lowerLeg, prefix + '_Foot', [0, -0.36, -0.08]);
    const legPivot = makeAvatarPivot(upperLeg, 'LEG_' + side, [0, 0, 0]);
    const shinPivot = makeAvatarPivot(lowerLeg, 'LEG_' + side + '_SHIN', [0, 0, 0]);
    const footPivot = makeAvatarPivot(foot, 'FOOT_' + side, [0, 0, 0]);
    makeAvatarMesh(legPivot, 'avatar_upper_leg_' + side, new THREE.BoxGeometry(0.28, 0.46, 0.28), new THREE.MeshBasicMaterial({ color: 0x334466 }), [0, -0.23, 0]);
    makeAvatarMesh(shinPivot, 'avatar_lower_leg_' + side, new THREE.BoxGeometry(0.24, 0.44, 0.24), new THREE.MeshBasicMaterial({ color: 0x445a88 }), [0, -0.22, 0]);
    makeAvatarMesh(footPivot, 'avatar_foot_' + side, new THREE.BoxGeometry(0.34, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x222a44 }), [0, -0.1, -0.12]);
  }

  const faceTexture = createAvatarSurfaceTexture();
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    alphaTest: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const faceDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), faceMaterial);
  faceDecal.name = 'FACE_DECAL';
  faceDecal.position.set(0, 0.12, -0.34);
  headAnchor.add(faceDecal);

  if (outsideTexture) {
    const outsideMaterial = new THREE.MeshBasicMaterial({
      map: createAvatarSurfaceTexture(),
      transparent: true,
      alphaTest: 0.1,
    });
    makeAvatarMesh(
      root.getObjectByName('ARM_L') || root,
      'outside_textured_piece',
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      outsideMaterial,
      [0, 0, 0],
    );
  }

  root.updateMatrixWorld(true);
  return root;
}

