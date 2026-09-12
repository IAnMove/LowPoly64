import * as THREE from 'three';

/**
 * Adapter for the Meshy humanoid profile used by the retro character editor.
 *
 * The adapter deliberately has no dependency on the editor state or on the
 * rigid-pivot runtime.  It inspects a native GLTF skin, then bakes an
 * editable retro group into a separate skinned copy while retaining the
 * donor's quaternion clips.
 */

export const COMPATIBLE_HUMANOID_RIG = 'meshy-humanoid-24';
export const COMPATIBLE_HUMANOID_VERSION = 1;

const EPSILON = 1e-5;
const STATIC_EPSILON = 1e-6;
// GLTF exporters quantize position keys in source units (the donor uses cm),
// so tiny float noise must not be mistaken for unsupported translation.
const POSITION_STATIC_EPSILON = 1e-4;

export const COMPATIBLE_HUMANOID_BONES = Object.freeze([
  'Hips',
  'Spine02',
  'Spine01',
  'Spine',
  'neck',
  'Head',
  'head_end',
  'headfront',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'LeftToeBase',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'RightToeBase',
]);

const COMPATIBLE_HUMANOID_PARENTS = Object.freeze({
  Hips: null,
  Spine02: 'Hips',
  Spine01: 'Spine02',
  Spine: 'Spine01',
  neck: 'Spine',
  Head: 'neck',
  head_end: 'Head',
  headfront: 'Head',
  LeftShoulder: 'Spine',
  LeftArm: 'LeftShoulder',
  LeftForeArm: 'LeftArm',
  LeftHand: 'LeftForeArm',
  RightShoulder: 'Spine',
  RightArm: 'RightShoulder',
  RightForeArm: 'RightArm',
  RightHand: 'RightForeArm',
  LeftUpLeg: 'Hips',
  LeftLeg: 'LeftUpLeg',
  LeftFoot: 'LeftLeg',
  LeftToeBase: 'LeftFoot',
  RightUpLeg: 'Hips',
  RightLeg: 'RightUpLeg',
  RightFoot: 'RightLeg',
  RightToeBase: 'RightFoot',
});

const PROFILE_BONE_SET = new Set(COMPATIBLE_HUMANOID_BONES);

const AVATAR_STANDARD_SKELETON = 'HUMANOID_STANDARD';

// Avatar Forge keeps the standard 19-joint names in the actual pivot tree and
// publishes the semantic names through slotMap/slotBindings. Keep this map
// local to this adapter: changing Object3D labels globally would break the
// existing standard rig and would make the source Avatar harder to edit.
const AVATAR_SEMANTIC_PIVOT_ALIASES = Object.freeze({
  PELVIS: Object.freeze(['PELVIS', 'Hips']),
  CHEST: Object.freeze(['CHEST', 'TORSO', 'Spine']),
  NECK: Object.freeze(['NECK', 'Neck']),
  HEAD: Object.freeze(['HEAD', 'Head']),
  CLAVICLE_L: Object.freeze(['CLAVICLE_L', 'Left_Shoulder', 'LEFT_SHOULDER']),
  ARM_L_UPPER: Object.freeze(['ARM_L_UPPER', 'Left_Upper_Arm', 'LEFT_ARM_UPPER', 'ARM_L', 'LEFT_ARM']),
  ARM_L_LOWER: Object.freeze(['ARM_L_LOWER', 'Left_Lower_Arm', 'LEFT_ARM_LOWER', 'ARM_L_FOREARM', 'LEFT_FOREARM']),
  HAND_L: Object.freeze(['HAND_L', 'Left_Hand', 'LEFT_HAND', 'HAND_LEFT']),
  CLAVICLE_R: Object.freeze(['CLAVICLE_R', 'Right_Shoulder', 'RIGHT_SHOULDER']),
  ARM_R_UPPER: Object.freeze(['ARM_R_UPPER', 'Right_Upper_Arm', 'RIGHT_ARM_UPPER', 'ARM_R', 'RIGHT_ARM']),
  ARM_R_LOWER: Object.freeze(['ARM_R_LOWER', 'Right_Lower_Arm', 'RIGHT_ARM_LOWER', 'ARM_R_FOREARM', 'RIGHT_FOREARM']),
  HAND_R: Object.freeze(['HAND_R', 'Right_Hand', 'RIGHT_HAND', 'HAND_RIGHT']),
  LEG_L_UPPER: Object.freeze(['LEG_L_UPPER', 'Left_Upper_Leg', 'LEFT_LEG_UPPER', 'LEG_L', 'LEFT_LEG']),
  LEG_L_LOWER: Object.freeze(['LEG_L_LOWER', 'Left_Lower_Leg', 'LEFT_LEG_LOWER', 'LEG_L_SHIN', 'LEFT_SHIN']),
  FOOT_L: Object.freeze(['FOOT_L', 'Left_Foot', 'LEFT_FOOT']),
  LEG_R_UPPER: Object.freeze(['LEG_R_UPPER', 'Right_Upper_Leg', 'RIGHT_LEG_UPPER', 'LEG_R', 'RIGHT_LEG']),
  LEG_R_LOWER: Object.freeze(['LEG_R_LOWER', 'Right_Lower_Leg', 'RIGHT_LEG_LOWER', 'LEG_R_SHIN', 'RIGHT_SHIN']),
  FOOT_R: Object.freeze(['FOOT_R', 'Right_Foot', 'RIGHT_FOOT']),
});

const AVATAR_SEMANTIC_PIVOT_IDS = Object.freeze(Object.keys(AVATAR_SEMANTIC_PIVOT_ALIASES));


function adapterError(message) {
  return new Error(`Compatible humanoid rig: ${message}`);
}

function clonePlain(value) {
  if (Array.isArray(value)) return value.map((entry) => clonePlain(entry));
  if (value && typeof value === 'object') {
    if (value.isColor) return value.getHexString();
    if (value.isVector2 || value.isVector3 || value.isVector4) {
      return [value.x, value.y, value.z, value.w].filter((entry) => entry !== undefined);
    }
    if (value.isQuaternion) return [value.x, value.y, value.z, value.w];
    if (value.isMatrix4) return value.toArray();
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)]));
  }
  return value;
}

function objectPathName(object) {
  if (!object) return '';
  const name = object.userData?.name || object.name;
  return typeof name === 'string' ? name : '';
}

function findSkinnedMeshes(source) {
  const meshes = [];
  if (!source || typeof source.traverse !== 'function') return meshes;
  source.traverse((object) => {
    if (object?.isSkinnedMesh) meshes.push(object);
  });
  return meshes;
}

function readTrackPath(trackName) {
  if (typeof trackName !== 'string') return { boneName: '', property: '' };
  const separator = trackName.lastIndexOf('.');
  if (separator < 0) return { boneName: '', property: '' };
  let path = trackName.slice(0, separator);
  const property = trackName.slice(separator + 1);
  const bracketMatch = path.match(/bones\[([^\]]+)\]/i);
  if (bracketMatch) path = bracketMatch[1];
  if (path.includes('|')) path = path.split('|').pop();
  if (path.includes('/')) path = path.split('/').pop();
  if (path.includes(':')) path = path.split(':').pop();
  return { boneName: path, property };
}

function valueAt(values, offset, size) {
  return Array.from(values.slice(offset, offset + size));
}

function valuesAreConstant(values, size, epsilon = STATIC_EPSILON) {
  if (!values || values.length <= size) return true;
  const first = valueAt(values, 0, size);
  for (let offset = size; offset < values.length; offset += size) {
    for (let component = 0; component < size; component += 1) {
      if (Math.abs(values[offset + component] - first[component]) > epsilon) return false;
    }
  }
  return true;
}

function trackValueSize(track) {
  if (Number.isFinite(track?.getValueSize?.())) return track.getValueSize();
  if (track?.ValueTypeName === 'quaternion') return 4;
  if (track?.ValueTypeName === 'vector') return 3;
  return track?.values?.length && track?.times?.length
    ? Math.max(1, Math.floor(track.values.length / track.times.length))
    : 0;
}

function analyzeClip(clip) {
  const tracks = Array.isArray(clip?.tracks) ? clip.tracks : [];
  const entries = tracks.map((track) => {
    const path = readTrackPath(track.name);
    const size = trackValueSize(track);
    return {
      track,
      ...path,
      size,
      // Position tracks get a slightly wider tolerance because exported cm
      // values often differ by a few 1e-5 even when the joint is fixed.
      constant: valuesAreConstant(
        track.values,
        size,
        path.property === 'position' ? POSITION_STATIC_EPSILON : STATIC_EPSILON,
      ),
    };
  });
  const animatedScale = entries.find((entry) => entry.property === 'scale' && !entry.constant);
  const animatedUnsupportedPosition = entries.find((entry) => (
    entry.property === 'position'
    && entry.boneName !== 'Hips'
    && !entry.constant
  ));
  const recognized = entries.filter((entry) => PROFILE_BONE_SET.has(entry.boneName));
  const staticClip = entries.length === 0 || entries.every((entry) => entry.constant);
  return {
    clip,
    name: clip?.name || 'Untitled clip',
    duration: Number.isFinite(clip?.duration) ? clip.duration : 0,
    tracks: entries,
    recognizedTrackCount: recognized.length,
    static: staticClip,
    moving: !staticClip,
    hipTranslation: entries.some((entry) => (
      entry.boneName === 'Hips'
      && entry.property === 'position'
      && !entry.constant
    )),
    animatedScale,
    animatedUnsupportedPosition,
  };
}

function composeLocalBindMatrix(bone, sourceBoneSet, cache) {
  if (cache.has(bone.name)) return cache.get(bone.name).clone();
  const local = new THREE.Matrix4().compose(
    bone.position?.clone?.() || new THREE.Vector3(),
    bone.quaternion?.clone?.() || new THREE.Quaternion(),
    bone.scale?.clone?.() || new THREE.Vector3(1, 1, 1),
  );
  const parent = bone.parent && sourceBoneSet.has(bone.parent) ? bone.parent : null;
  if (parent) local.premultiply(composeLocalBindMatrix(parent, sourceBoneSet, cache));
  cache.set(bone.name, local.clone());
  return local;
}

function estimateMeshHeight(mesh) {
  const position = mesh?.geometry?.getAttribute?.('position');
  if (!position || position.count === 0) return 0;
  const matrix = mesh.matrixWorld?.clone?.() || new THREE.Matrix4();
  const point = new THREE.Vector3();
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).applyMatrix4(matrix);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return Number.isFinite(minY) && Number.isFinite(maxY) ? maxY - minY : 0;
}

function readBindTransforms(skeleton, bones) {
  if (!Array.isArray(skeleton.boneInverses) || skeleton.boneInverses.length < bones.length) {
    throw adapterError('la skin no contiene matrices inverseBind completas');
  }
  const bindByName = new Map();
  bones.forEach((bone, index) => {
    const inverse = skeleton.boneInverses[index];
    if (!inverse?.isMatrix4) {
      throw adapterError(`falta inverseBind para ${bone.name}`);
    }
    const bindMatrix = inverse.clone().invert();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    bindMatrix.decompose(position, quaternion, scale);
    if (![position.x, position.y, position.z, quaternion.x, quaternion.y, quaternion.z, quaternion.w]
      .every(Number.isFinite)) {
      throw adapterError(`inverseBind inválida para ${bone.name}`);
    }
    bindByName.set(bone.name, { matrix: bindMatrix.clone(), position, quaternion: quaternion.normalize(), scale, inverse: inverse.clone() });
  });
  return bindByName;
}


function deriveLocalBindTransforms(skeleton, bones, bindByName, rootBindMatrix = null) {
  const sourceBoneSet = new Set(bones);
  const localTransforms = new Map();
  bones.forEach((bone) => {
    const bind = bindByName.get(bone.name);
    const parent = bone.parent && sourceBoneSet.has(bone.parent) ? bone.parent : null;
    const parentMatrix = parent
      ? bindByName.get(parent.name).matrix.clone()
      : rootBindMatrix?.clone() || (bone.parent?.matrixWorld?.isMatrix4
        ? bone.parent.matrixWorld.clone()
        : new THREE.Matrix4());
    const localMatrix = parentMatrix.invert().multiply(bind.matrix.clone());
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    localMatrix.decompose(position, quaternion, scale);
    localTransforms.set(bone.name, { matrix: localMatrix, position, quaternion: quaternion.normalize(), scale });
  });
  return localTransforms;
}
function readWeightedBoneNames(mesh, skeletonBones) {
  const skinIndex = mesh.geometry?.getAttribute?.('skinIndex');
  const skinWeight = mesh.geometry?.getAttribute?.('skinWeight');
  if (!skinIndex || !skinWeight || skinIndex.itemSize < 1 || skinWeight.itemSize < 1) {
    throw adapterError('la malla skinned no contiene skinIndex/skinWeight');
  }
  const weighted = new Set();
  for (let vertex = 0; vertex < skinIndex.count; vertex += 1) {
    for (let influence = 0; influence < Math.min(skinIndex.itemSize, skinWeight.itemSize); influence += 1) {
      if (skinWeight.getComponent(vertex, influence) > EPSILON) {
        const boneIndex = skinIndex.getComponent(vertex, influence);
        const bone = skeletonBones[boneIndex];
        if (!bone) throw adapterError(`skinIndex ${boneIndex} no apunta a un hueso válido`);
        weighted.add(bone.name);
      }
    }
  }
  return weighted;
}

function resolveNativeClips(sourceGroup) {
  const candidates = [
    sourceGroup?.userData?.animationClips,
    sourceGroup?.animationClips,
    sourceGroup?.animations,
  ];
  return candidates.find((value) => Array.isArray(value) && value.every((clip) => clip?.tracks)) || [];
}

/**
 * Inspect the supplied Meshy GLB profile. No source transforms or resources
 * are changed; the private fields in the report are references used by the
 * copy builder and are intentionally not serialized by the editor.
 */
export function inspectCompatibleHumanoidSource(sourceGroup) {
  if (!sourceGroup || typeof sourceGroup.traverse !== 'function') {
    throw adapterError('se esperaba un Group con una SkinnedMesh');
  }
  const meshes = findSkinnedMeshes(sourceGroup);
  if (meshes.length !== 1) {
    throw adapterError(`se esperaba una sola SkinnedMesh y se encontraron ${meshes.length}`);
  }
  const sourceMesh = meshes[0];
  const skeleton = sourceMesh.skeleton;
  const bones = Array.isArray(skeleton?.bones) ? skeleton.bones : [];
  if (!skeleton || bones.length !== COMPATIBLE_HUMANOID_BONES.length) {
    throw adapterError(`se esperaban 24 huesos y se encontraron ${bones.length}`);
  }
  const bonesByName = new Map();
  bones.forEach((bone) => {
    if (!bone?.name || bonesByName.has(bone.name)) throw adapterError('la skin contiene nombres de hueso duplicados');
    bonesByName.set(bone.name, bone);
  });
  const missing = COMPATIBLE_HUMANOID_BONES.filter((name) => !bonesByName.has(name));
  const unexpected = bones.map((bone) => bone.name).filter((name) => !PROFILE_BONE_SET.has(name));
  if (missing.length || unexpected.length) {
    throw adapterError(`perfil incompatible; faltan [${missing.join(', ')}] y sobran [${unexpected.join(', ')}]`);
  }
  COMPATIBLE_HUMANOID_BONES.forEach((name) => {
    const bone = bonesByName.get(name);
    const expectedParent = COMPATIBLE_HUMANOID_PARENTS[name];
    const actualParent = bone.parent?.name || null;
    if (name !== 'Hips' && actualParent !== expectedParent) {
      throw adapterError(`jerarquía inválida: ${name} debe colgar de ${expectedParent}, no de ${actualParent || 'la raíz'}`);
    }
  });

  const weightedNames = readWeightedBoneNames(sourceMesh, bones);

  const bindByName = readBindTransforms(skeleton, bones);
  // Our exported inverse binds are built in character space before scene
  // placement. Reusing a moved/scaled copy must ignore that external placement.
  const rootBindMatrix = sourceGroup.userData?.compatibleRig === COMPATIBLE_HUMANOID_RIG
    ? new THREE.Matrix4() : null;
  const localBindTransforms = deriveLocalBindTransforms(skeleton, bones, bindByName, rootBindMatrix);
  const localBindPositions = new Map([...localBindTransforms.entries()].map(([name, transform]) => [name, transform.position.clone()]));
  const localBindY = [...localBindTransforms.values()].map((transform) => transform.position.y);
  const localHeight = Math.max(Math.max(...localBindY) - Math.min(...localBindY), EPSILON);
  const bindWorldY = [...bindByName.values()].map((bind) => bind.position.y);
  const sourceFloorY = Math.min(...bindWorldY);
  const sourceHipHeight = Math.max(bindByName.get('Hips').position.y - sourceFloorY, EPSILON);
  const sourceBoneSet = new Set(bones);
  const hipsParent = bonesByName.get('Hips').parent && !sourceBoneSet.has(bonesByName.get('Hips').parent)
    ? bonesByName.get('Hips').parent
    : null;
  const hipsParentMatrix = rootBindMatrix?.clone() || (hipsParent?.matrixWorld?.isMatrix4
    ? hipsParent.matrixWorld.clone()
    : new THREE.Matrix4());
  const hipsParentPosition = new THREE.Vector3();
  const hipsParentQuaternion = new THREE.Quaternion();
  const hipsParentScale = new THREE.Vector3(1, 1, 1);
  hipsParentMatrix.decompose(hipsParentPosition, hipsParentQuaternion, hipsParentScale);
  const visibleHeight = Math.max(estimateMeshHeight(sourceMesh), sourceHipHeight);
  const clips = resolveNativeClips(sourceGroup);
  if (clips.length === 0) throw adapterError('el GLB no contiene AnimationClip nativos');
  const clipAnalyses = clips.map(analyzeClip);
  const unsupportedScale = clipAnalyses.find((analysis) => analysis.animatedScale);
  if (unsupportedScale) {
    throw adapterError(`escala animada no soportada en ${unsupportedScale.name}: ${unsupportedScale.animatedScale.track.name}`);
  }
  const unsupportedPosition = clipAnalyses.find((analysis) => analysis.animatedUnsupportedPosition);
  if (unsupportedPosition) {
    throw adapterError(`solo se admite traslación animada de Hips; aparece ${unsupportedPosition.animatedUnsupportedPosition.track.name}`);
  }
  const movingClips = clipAnalyses.filter((analysis) => analysis.moving && analysis.recognizedTrackCount > 0);
  if (movingClips.length === 0) throw adapterError('el GLB no contiene clips de movimiento compatibles');

  return {
    ok: true,
    compatible: true,
    profile: COMPATIBLE_HUMANOID_RIG,
    version: COMPATIBLE_HUMANOID_VERSION,
    meshCount: meshes.length,
    boneCount: bones.length,
    weightedBoneCount: weightedNames.size,
    weightedBones: [...weightedNames],
    bones: COMPATIBLE_HUMANOID_BONES.map((name) => ({
      name,
      parent: COMPATIBLE_HUMANOID_PARENTS[name],
      weighted: weightedNames.has(name),
      bindPosition: bindByName.get(name).position.toArray(),
      bindQuaternion: bindByName.get(name).quaternion.toArray(),
    })),
    clips: clipAnalyses.map((analysis) => ({
      name: analysis.name,
      duration: analysis.duration,
      trackCount: analysis.tracks.length,
      recognizedTrackCount: analysis.recognizedTrackCount,
      static: analysis.static,
      moving: analysis.moving,
      hipTranslation: analysis.hipTranslation,
    })),
    movingClips: movingClips.map((analysis) => analysis.name),
    localHeight,
    visibleHeight,
    hipHeight: sourceHipHeight,
    _hipsParentQuaternion: hipsParentQuaternion,
    _hipsParentScale: hipsParentScale,
    _sourceMesh: sourceMesh,
    _sourceSkeleton: skeleton,
    _bonesByName: bonesByName,
    _bindByName: bindByName,
    _localBindPositions: localBindPositions,
    _clipAnalyses: clipAnalyses,
  };
}

function normalizePivotAlias(value) {
  return String(value || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function addUniquePivotAlias(aliases, semantic, value) {
  if (!AVATAR_SEMANTIC_PIVOT_ALIASES[semantic] || typeof value !== 'string' || !value.trim()) return;
  if (!aliases[semantic].includes(value)) aliases[semantic].push(value);
}

function addAvatarMetadataAlias(aliases, slotId, value) {
  const normalizedSlot = normalizePivotAlias(slotId);
  const normalized = normalizePivotAlias(value);
  if (!normalized) return;

  if (normalizedSlot === 'HEAD') {
    addUniquePivotAlias(aliases, 'HEAD', value);
    return;
  }
  if (normalizedSlot === 'TORSO') {
    if (/^(HIPS|PELVIS)$/.test(normalized)) addUniquePivotAlias(aliases, 'PELVIS', value);
    else if (normalized === 'NECK') addUniquePivotAlias(aliases, 'NECK', value);
    else if (/SPINE|TORSO|CHEST/.test(normalized)) addUniquePivotAlias(aliases, 'CHEST', value);
    return;
  }

  const limbMatch = normalizedSlot.match(/^(ARM|LEG)_([LR])$/);
  if (!limbMatch) return;
  const kind = limbMatch[1];
  const side = limbMatch[2];
  if (kind === 'ARM') {
    if (/HAND/.test(normalized)) addUniquePivotAlias(aliases, 'HAND_' + side, value);
    else if (/CLAVICLE|SHOULDER/.test(normalized)) addUniquePivotAlias(aliases, 'CLAVICLE_' + side, value);
    else if (/LOWER|FOREARM/.test(normalized)) addUniquePivotAlias(aliases, 'ARM_' + side + '_LOWER', value);
    else if (/UPPER|^ARM_[LR]$|^LEFT_ARM$|^RIGHT_ARM$/.test(normalized)) {
      addUniquePivotAlias(aliases, 'ARM_' + side + '_UPPER', value);
    }
    return;
  }
  if (/FOOT/.test(normalized)) addUniquePivotAlias(aliases, 'FOOT_' + side, value);
  else if (/LOWER|SHIN/.test(normalized)) addUniquePivotAlias(aliases, 'LEG_' + side + '_LOWER', value);
  else if (/UPPER|^LEG_[LR]$|^LEFT_LEG$|^RIGHT_LEG$/.test(normalized)) {
    addUniquePivotAlias(aliases, 'LEG_' + side + '_UPPER', value);
  }
}

function buildAvatarSemanticAliases(userData = {}) {
  const aliases = Object.fromEntries(
    AVATAR_SEMANTIC_PIVOT_IDS.map((semantic) => [
      semantic,
      [...AVATAR_SEMANTIC_PIVOT_ALIASES[semantic]],
    ]),
  );
  [userData.slotMap, userData.slotBindings].forEach((bindings) => {
    if (!bindings || typeof bindings !== 'object') return;
    Object.entries(bindings).forEach(([slotId, names]) => {
      if (!Array.isArray(names)) return;
      names.forEach((name) => addAvatarMetadataAlias(aliases, slotId, name));
    });
  });
  return aliases;
}

function findNamedPivots(root, { avatar = false } = {}) {
  const pivots = new Map();
  root.traverse((object) => {
    const name = objectPathName(object);
    if (!name || object.isMesh || object.isSkinnedMesh || pivots.has(name)) return;
    pivots.set(name, object);
  });
  if (!avatar) return pivots;

  const aliases = buildAvatarSemanticAliases(root.userData || {});
  const semanticByObject = new Map();
  AVATAR_SEMANTIC_PIVOT_IDS.forEach((semantic) => {
    const semanticAliases = aliases[semantic] || [];
    const pivot = semanticAliases.map((name) => pivots.get(name)).find(Boolean);
    if (pivot) pivots.set(semantic, pivot);
    semanticAliases.forEach((name) => {
      const node = pivots.get(name);
      if (node && !semanticByObject.has(node)) semanticByObject.set(node, semantic);
    });
  });
  Object.defineProperty(pivots, 'semanticByObject', {
    value: semanticByObject,
    enumerable: false,
  });
  return pivots;
}


function alignAvatarToAnimationBasis(working, pivots) {
  // Forge geometry faces -Z before its scene rotation; this donor faces +Z.
  // Bake in the donor's basis, then undo this basis change on the result root.
  working.rotateY(Math.PI);
  working.updateMatrixWorld(true);
  const left = worldPoint(pivots.get('ARM_L_UPPER'));
  const right = worldPoint(pivots.get('ARM_R_UPPER'));
  if (left.x <= right.x) return;
  const swapSide = semantic => semantic.replace(/_([LR])(?=_|$)/, (_, side) => side === 'L' ? '_R' : '_L');
  const original = new Map(pivots);
  AVATAR_SEMANTIC_PIVOT_IDS.forEach(semantic => pivots.set(semantic, original.get(swapSide(semantic))));
  pivots.semanticByObject?.forEach((semantic, object) => pivots.semanticByObject.set(object, swapSide(semantic)));
}

function restoreAvatarSceneBasis(result) {
  const basis = new THREE.Matrix4().makeRotationY(Math.PI);
  if (result.matrixAutoUpdate === false) {
    result.matrix.multiply(basis);
    result.matrix.decompose(result.position, result.quaternion, result.scale);
  } else {
    result.rotateY(Math.PI);
  }
}

function worldPoint(object) {
  return object.getWorldPosition(new THREE.Vector3());
}

function rotateObjectToWorldVector(object, start, end, targetDirection) {
  const vector = end.clone().sub(start);
  if (vector.lengthSq() < EPSILON) return false;
  const desired = targetDirection.clone().normalize();
  const deltaWorld = new THREE.Quaternion().setFromUnitVectors(vector.normalize(), desired);
  const parentWorld = object.parent
    ? object.parent.getWorldQuaternion(new THREE.Quaternion())
    : new THREE.Quaternion();
  const currentWorld = object.getWorldQuaternion(new THREE.Quaternion());
  const nextWorld = deltaWorld.multiply(currentWorld);
  const local = parentWorld.invert().multiply(nextWorld);
  object.quaternion.copy(local.normalize());
  object.updateWorldMatrix(true, true);
  return true;
}

function normalizeCloneArms(working, pivots) {
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    const upper = pivots.get(`ARM_${side}_UPPER`) || pivots.get(`CLAVICLE_${side}`);
    const lower = pivots.get(`ARM_${side}_LOWER`);
    const hand = pivots.get(`HAND_${side}`);
    if (!upper || !lower || !hand) continue;
    const shoulder = worldPoint(upper);
    const elbow = worldPoint(lower);
    rotateObjectToWorldVector(upper, shoulder, elbow, new THREE.Vector3(sign, 0, 0));
    working.updateMatrixWorld(true);
    const newElbow = worldPoint(lower);
    const wrist = worldPoint(hand);
    rotateObjectToWorldVector(lower, newElbow, wrist, new THREE.Vector3(sign, 0, 0));
  }
  working.updateMatrixWorld(true);
}

function neutralClone(root) {
  const working = root.clone(true);
  working.matrixAutoUpdate = true;
  working.position.set(0, 0, 0);
  working.quaternion.identity();
  working.scale.set(1, 1, 1);
  working.matrix.identity();
  working.updateMatrixWorld(true);
  return working;
}

function collectBounds(root) {
  const position = new THREE.Vector3();
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  let count = 0;
  root.traverse((object) => {
    if (!object.isMesh || object.isSkinnedMesh) return;
    const attribute = object.geometry?.getAttribute?.('position');
    if (!attribute) return;
    for (let index = 0; index < attribute.count; index += 1) {
      position.fromBufferAttribute(attribute, index).applyMatrix4(object.matrixWorld);
      min.min(position);
      max.max(position);
      count += 1;
    }
  });
  if (count === 0) return { min: new THREE.Vector3(), max: new THREE.Vector3(), size: new THREE.Vector3() };
  return { min, max, size: max.clone().sub(min) };
}

function collectTargetAnchors(working, pivots, bounds) {
  const required = [
    'PELVIS', 'CHEST', 'NECK', 'HEAD',
    'CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L',
    'CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R',
    'LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L',
    'LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R',
  ];
  const anchors = new Map();
  required.forEach((name) => {
    const pivot = pivots.get(name);
    if (!pivot) throw adapterError(`el cuerpo retro no tiene el pivote ${name}`);
    anchors.set(name, worldPoint(pivot));
  });
  const helperSize = Math.max(bounds.size.y * 0.12, 0.08);
  anchors.set('head_end', anchors.get('HEAD').clone().add(new THREE.Vector3(0, helperSize * 0.55, 0)));
  anchors.set('headfront', anchors.get('HEAD').clone().add(new THREE.Vector3(0, 0, helperSize * 0.35)));
  const toeDepth = Math.max(bounds.size.z * 0.16, 0.08);
  anchors.set('LeftToeBase', anchors.get('FOOT_L').clone().add(new THREE.Vector3(0, 0, toeDepth)));
  anchors.set('RightToeBase', anchors.get('FOOT_R').clone().add(new THREE.Vector3(0, 0, toeDepth)));
  return anchors;
}

function avatarForgeTargetMissingPivots(object) {
  const pivots = findNamedPivots(object, { avatar: true });
  const required = [
    'PELVIS', 'CHEST', 'NECK', 'HEAD',
    'CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L',
    'CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R',
    'LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L',
    'LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R',
  ];
  return {
    pivots,
    missing: required.filter((name) => !pivots.get(name)),
  };
}

function isAvatarForgeHumanoidTarget(object) {
  const userData = object?.userData || {};
  const recipe = userData.avatarRecipe;
  const groupSkeleton = String(userData.skeletonId || '').trim().toUpperCase();
  const recipeSkeleton = String(recipe?.skeletonId || '').trim().toUpperCase();
  if (!object?.isObject3D || !recipe || String(userData.archetype || '').toUpperCase() !== 'HUMANOID') return false;
  if (groupSkeleton !== AVATAR_STANDARD_SKELETON || recipeSkeleton !== AVATAR_STANDARD_SKELETON) return false;
  if (userData.nativeGltf === true || userData.compatibleRig === COMPATIBLE_HUMANOID_RIG) return false;
  return avatarForgeTargetMissingPivots(object).missing.length === 0;
}

function sourceSide(sourceName, bindPosition) {
  if (Math.abs(bindPosition?.x || 0) > EPSILON) return bindPosition.x < 0 ? 'L' : 'R';
  return sourceName.startsWith('Left') ? 'R' : 'L';
}

function sourceTargetPivot(sourceName, bindPosition) {
  if (sourceName === 'Hips') return 'PELVIS';
  if (sourceName === 'Spine02') return null;
  if (sourceName === 'Spine01') return null;
  if (sourceName === 'Spine') return 'CHEST';
  if (sourceName === 'neck') return 'NECK';
  if (sourceName === 'Head') return 'HEAD';
  if (sourceName === 'head_end' || sourceName === 'headfront') return sourceName;
  const side = sourceSide(sourceName, bindPosition);
  if (sourceName.endsWith('Shoulder')) return `CLAVICLE_${side}`;
  if (sourceName.endsWith('Arm') && !sourceName.endsWith('ForeArm')) return `ARM_${side}_UPPER`;
  if (sourceName.endsWith('ForeArm')) return `ARM_${side}_LOWER`;
  if (sourceName.endsWith('Hand')) return `HAND_${side}`;
  if (sourceName.endsWith('UpLeg')) return `LEG_${side}_UPPER`;
  if (sourceName.endsWith('Leg')) return `LEG_${side}_LOWER`;
  if (sourceName.endsWith('Foot')) return `FOOT_${side}`;
  if (sourceName.endsWith('ToeBase')) return `${side === 'L' ? 'Left' : 'Right'}ToeBase`;
  return null;
}

function buildTargetPositions(info, anchors) {
  const pelvis = anchors.get('PELVIS');
  const chest = anchors.get('CHEST');
  const positions = new Map();
  positions.set('Hips', pelvis.clone());
  positions.set('Spine02', pelvis.clone().lerp(chest, 1 / 3));
  positions.set('Spine01', pelvis.clone().lerp(chest, 2 / 3));
  positions.set('Spine', chest.clone());
  COMPATIBLE_HUMANOID_BONES.forEach((name) => {
    if (positions.has(name)) return;
    const pivot = sourceTargetPivot(name, info._bindByName.get(name)?.position);
    const point = pivot ? anchors.get(pivot) : null;
    if (!point) throw adapterError(`no se pudo ajustar el hueso ${name} al cuerpo retro`);
    positions.set(name, point.clone());
  });
  // The source shoulders are real intermediate joints. The retro generator
  // exposes the clavicle and upper-arm pivots at the same shoulder location,
  // so place each compatible shoulder internally at 22% of CHEST -> arm.
  positions.set(
    'LeftShoulder',
    chest.clone().lerp(anchors.get('ARM_R_UPPER'), 0.22),
  );
  positions.set(
    'RightShoulder',
    chest.clone().lerp(anchors.get('ARM_L_UPPER'), 0.22),
  );
  return positions;
}

function buildTargetBones(result, info, positions) {
  const bonesByName = new Map();
  COMPATIBLE_HUMANOID_BONES.forEach((name) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.userData.name = name;
    bone.userData.compatibleSourceBone = name;
    bonesByName.set(name, bone);
  });
  COMPATIBLE_HUMANOID_BONES.forEach((name) => {
    const bone = bonesByName.get(name);
    const parentName = COMPATIBLE_HUMANOID_PARENTS[name];
    const bindQuaternion = info._bindByName.get(name).quaternion.clone();
    if (parentName) {
      const parent = bonesByName.get(parentName);
      const parentBindQuaternion = info._bindByName.get(parentName).quaternion.clone();
      const localPosition = positions.get(name).clone().sub(positions.get(parentName));
      localPosition.applyQuaternion(parentBindQuaternion.clone().invert());
      bone.position.copy(localPosition);
      bone.quaternion.copy(parentBindQuaternion.clone().invert().multiply(bindQuaternion).normalize());
      parent.add(bone);
    } else {
      bone.position.copy(positions.get(name));
      bone.quaternion.copy(info._hipsParentQuaternion.clone().invert().multiply(bindQuaternion).normalize());
      result.add(bone);
    }
  });
  const orderedBones = COMPATIBLE_HUMANOID_BONES.map((name) => bonesByName.get(name));
  result.updateMatrixWorld(true);
  return { bonesByName, orderedBones };
}

const PIVOT_TO_SOURCE_BONE = Object.freeze({
  CLAVICLE_L: 'RightShoulder',
  ARM_L_UPPER: 'RightArm',
  ARM_L_LOWER: 'RightForeArm',
  HAND_L: 'RightHand',
  CLAVICLE_R: 'LeftShoulder',
  ARM_R_UPPER: 'LeftArm',
  ARM_R_LOWER: 'LeftForeArm',
  HAND_R: 'LeftHand',
  LEG_L_UPPER: 'RightUpLeg',
  LEG_L_LOWER: 'RightLeg',
  FOOT_L: 'RightFoot',
  LEG_R_UPPER: 'LeftUpLeg',
  LEG_R_LOWER: 'LeftLeg',
  FOOT_R: 'LeftFoot',
  NECK: 'neck',
  HEAD: 'Head',
});

function findMeshPivot(mesh, root, pivots) {
  let current = mesh;
  while (current && current !== root) {
    const rawId = objectPathName(current);
    const semanticId = pivots.semanticByObject?.get(current) || rawId;
    if (semanticId
      && (pivots.get(semanticId) === current || pivots.semanticByObject?.get(current) === semanticId)
      && (PIVOT_TO_SOURCE_BONE[semanticId] || ['PELVIS', 'TORSO', 'CHEST'].includes(semanticId))) {
      return semanticId;
    }
    current = current.parent;
  }
  return null;
}

function torsoInfluences(y, anchors, positions) {
  const spine = ['Hips', 'Spine02', 'Spine01', 'Spine'];
  const values = spine.map((name) => positions.get(name).y);
  if (y <= values[0]) return [{ bone: 'Hips', weight: 1 }];
  if (y >= values[values.length - 1]) return [{ bone: 'Spine', weight: 1 }];
  for (let index = 0; index < values.length - 1; index += 1) {
    const start = values[index];
    const end = values[index + 1];
    if (y <= end + EPSILON) {
      const denominator = Math.max(end - start, EPSILON);
      const t = THREE.MathUtils.clamp((y - start) / denominator, 0, 1);
      return [
        { bone: spine[index], weight: 1 - t },
        { bone: spine[index + 1], weight: t },
      ];
    }
  }
  return [{ bone: 'Spine', weight: 1 }];
}

function influencesForPivot(pivotId, vertexY, anchors, positions) {
  if (pivotId === 'PELVIS' || pivotId === 'TORSO' || pivotId === 'CHEST') {
    return torsoInfluences(vertexY, anchors, positions);
  }
  if (pivotId === 'HEAD' || pivotId?.startsWith('HAIR') || pivotId?.startsWith('EYE') || pivotId?.startsWith('PUPIL')) {
    return [{ bone: 'Head', weight: 1 }];
  }
  if (pivotId === 'NECK') return [{ bone: 'neck', weight: 1 }];
  const sourceBone = PIVOT_TO_SOURCE_BONE[pivotId];
  if (sourceBone) return [{ bone: sourceBone, weight: 1 }];
  return null;
}

function colorFromMaterial(material) {
  if (!material?.color?.isColor) return new THREE.Color(0xffffff);
  return material.color.clone();
}

const MATERIAL_SURFACE_PROPERTIES = Object.freeze([
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'emissiveMap',
]);

function materialSurfaceIssue(material) {
  if (!material || !material.isMaterial) return null;
  const textureProperty = MATERIAL_SURFACE_PROPERTIES.find((key) => material[key]);
  if (textureProperty) return { property: textureProperty, textured: true };
  if (material.transparent || material.alphaTest > EPSILON || material.depthWrite === false || material.opacity < 1 - EPSILON) {
    return { property: 'transparency', textured: false };
  }
  return null;
}

function materialArraySurfaceIssue(material, meshName) {
  const materials = Array.isArray(material) ? material : [material];
  const issue = materials
    .map((entry) => materialSurfaceIssue(entry))
    .find(Boolean);
  if (!issue) return null;
  return {
    ...issue,
    message: 'la pieza ' + (meshName || 'sin nombre') + ' usa ' + issue.property,
  };
}

function cloneMaterialWithTextures(material) {
  if (!material?.isMaterial) return material;
  const clone = material.clone();
  MATERIAL_SURFACE_PROPERTIES.forEach((property) => {
    if (clone[property]?.isTexture && typeof clone[property].clone === 'function') {
      clone[property] = clone[property].clone();
    }
  });
  clone.needsUpdate = true;
  return clone;
}

function cloneMaterialsWithTextures(material) {
  return Array.isArray(material)
    ? material.map((entry) => cloneMaterialWithTextures(entry))
    : cloneMaterialWithTextures(material);
}

function cloneHeadSurfaceMesh(mesh, headBone) {
  const clone = mesh.clone(false);
  clone.geometry = mesh.geometry.clone();
  clone.material = cloneMaterialsWithTextures(mesh.material);
  clone.userData = {
    ...(mesh.userData || {}),
    compatibleHeadSurface: true,
  };
  const localMatrix = headBone.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  localMatrix.decompose(clone.position, clone.quaternion, clone.scale);
  clone.matrixAutoUpdate = true;
  clone.updateMatrix();
  headBone.add(clone);
  return clone;
}

function attachHeadSurfaceMeshes(headBone, meshes) {
  if (!headBone || !Array.isArray(meshes)) return 0;
  meshes.forEach((mesh) => cloneHeadSurfaceMesh(mesh, headBone));
  return meshes.length;
}

function rejectUnsupportedMaterial(material, meshName) {
  if (!material || !material.isMaterial) return;
  const unsupported = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'emissiveMap'];
  const property = unsupported.find((key) => material[key]);
  if (property) throw adapterError(`material ${meshName} usa textura ${property}; el rig compatible necesita colores planos`);
}

function pushBakedTriangle(accumulator, geometry, vertexIndex, mesh, pivotId, anchors, positions, material) {
  const position = geometry.getAttribute('position');
  const colors = geometry.getAttribute('color');
  const point = new THREE.Vector3().fromBufferAttribute(position, vertexIndex);
  const color = colors
    ? new THREE.Color(colors.getX(vertexIndex), colors.getY(vertexIndex), colors.getZ(vertexIndex))
    : colorFromMaterial(material);
  const influences = influencesForPivot(pivotId, point.y, anchors, positions);
  if (!influences) throw adapterError(`no se pudo asignar ${mesh.name || 'una pieza'} al esqueleto compatible`);
  const normalized = influences
    .filter((entry) => entry.weight > 0)
    .slice(0, 4);
  const total = normalized.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  while (normalized.length < 4) normalized.push({ bone: normalized[0].bone, weight: 0 });
  accumulator.positions.push(point.x, point.y, point.z);
  accumulator.colors.push(color.r, color.g, color.b);
  accumulator.influences.push(
    normalized[0].bone, normalized[0].weight / total,
    normalized[1].bone, normalized[1].weight / total,
    normalized[2].bone, normalized[2].weight / total,
    normalized[3].bone, normalized[3].weight / total,
  );
}

function bakeRetroGeometry(working, pivots, anchors, positions) {
  const accumulator = { positions: [], colors: [], influences: [] };
  const headSurfaceMeshes = [];
  let meshCount = 0;
  let bodyMeshCount = 0;
  working.traverse((mesh) => {
    if (!mesh.isMesh || mesh.isSkinnedMesh || !mesh.geometry?.getAttribute?.('position')) return;
    meshCount += 1;
    const pivotId = findMeshPivot(mesh, working, pivots);
    if (!pivotId) throw adapterError('la pieza ' + (mesh.name || 'sin nombre') + ' no cuelga de un pivote conocido');
    const surfaceIssue = materialArraySurfaceIssue(mesh.material, mesh.name || 'sin nombre');
    if (pivotId === 'HEAD' && surfaceIssue) {
      headSurfaceMeshes.push(mesh);
      return;
    }
    if (surfaceIssue) {
      throw adapterError(
        surfaceIssue.message + ' fuera de la cabeza; se conserva el avatar original y no se crea una copia parcial',
      );
    }
    if (Array.isArray(mesh.material)) {
      throw adapterError('la pieza ' + (mesh.name || 'sin nombre') + ' usa varios materiales');
    }
    bodyMeshCount += 1;
    const sourceGeometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    sourceGeometry.applyMatrix4(mesh.matrixWorld);
    const position = sourceGeometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      pushBakedTriangle(accumulator, sourceGeometry, index, mesh, pivotId, anchors, positions, mesh.material);
    }
    sourceGeometry.dispose();
  });
  if (bodyMeshCount === 0 || accumulator.positions.length === 0) {
    throw adapterError('el cuerpo retro no contiene geometría editable fuera de los decals de cabeza');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(accumulator.positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(accumulator.colors, 3));
  const boneIndexByName = new Map(COMPATIBLE_HUMANOID_BONES.map((name, index) => [name, index]));
  const skinIndices = [];
  const skinWeights = [];
  for (let offset = 0; offset < accumulator.influences.length; offset += 8) {
    skinIndices.push(
      boneIndexByName.get(accumulator.influences[offset]) ?? 0,
      boneIndexByName.get(accumulator.influences[offset + 2]) ?? 0,
      boneIndexByName.get(accumulator.influences[offset + 4]) ?? 0,
      boneIndexByName.get(accumulator.influences[offset + 6]) ?? 0,
    );
    skinWeights.push(
      accumulator.influences[offset + 1], accumulator.influences[offset + 3],
      accumulator.influences[offset + 5], accumulator.influences[offset + 7],
    );
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return {
    geometry,
    minY: geometry.boundingBox?.min.y || 0,
    maxY: geometry.boundingBox?.max.y || 0,
    height: Math.max(geometry.boundingBox?.max.y - geometry.boundingBox?.min.y || 0, EPSILON),
    triangleCount: accumulator.positions.length / 9,
    headSurfaceMeshes,
    meshCount,
  };
}

function cloneTrackWithName(track, name) {
  const clone = track.clone();
  clone.name = name;
  return clone;
}

function retargetHipTrack(track, sourceHipLocalPosition, targetHipPosition, sourceParentQuaternion, sourceParentScale, scale) {
  const size = trackValueSize(track);
  if (size !== 3) throw adapterError(`la pista ${track.name} no es una traslación de 3 componentes`);
  const values = new Float32Array(track.values.length);
  for (let key = 0; key < track.times.length; key += 1) {
    const offset = key * size;
    const deltaLocal = new THREE.Vector3(
      track.values[offset] - sourceHipLocalPosition.x,
      track.values[offset + 1] - sourceHipLocalPosition.y,
      track.values[offset + 2] - sourceHipLocalPosition.z,
    );
    const deltaTarget = deltaLocal
      .multiply(sourceParentScale)
      .applyQuaternion(sourceParentQuaternion)
      .multiplyScalar(scale);
    values[offset] = targetHipPosition.x + deltaTarget.x;
    values[offset + 1] = targetHipPosition.y + deltaTarget.y;
    values[offset + 2] = targetHipPosition.z + deltaTarget.z;
  }
  return new THREE.VectorKeyframeTrack('Hips.position', track.times.slice(), values, track.getInterpolation?.());
}

function buildCompatibleClips(info, targetHipPosition, targetHipHeight, options = {}) {
  const includeStatic = options.includeStaticClips === true;
  const scale = targetHipHeight / Math.max(info.hipHeight, EPSILON);
  const sourceHip = info._bonesByName.get('Hips');
  const clips = [];
  info._clipAnalyses.forEach((analysis) => {
    if (analysis.static && !includeStatic) return;
    const tracks = [];
    analysis.tracks.forEach((entry) => {
      if (!PROFILE_BONE_SET.has(entry.boneName)) return;
      if (entry.property === 'scale') return;
      if (entry.property === 'position') {
        if (entry.boneName !== 'Hips' || entry.constant) return;
        tracks.push(retargetHipTrack(
          entry.track,
          info._localBindPositions.get('Hips'),
          targetHipPosition,
          info._hipsParentQuaternion,
          info._hipsParentScale,
          scale,
        ));
        return;
      }
      if (entry.property === 'quaternion') {
        tracks.push(cloneTrackWithName(entry.track, `${entry.boneName}.quaternion`));
      }
    });
    if (tracks.length === 0) return;
    clips.push(new THREE.AnimationClip(analysis.name, analysis.duration, tracks));
  });
  return clips;
}

function copyRootTransform(result, source) {
  if (source.matrixAutoUpdate === false) {
    result.matrix.copy(source.matrix);
    result.matrixAutoUpdate = false;
    result.matrixWorldNeedsUpdate = true;
    return;
  }
  result.position.copy(source.position);
  result.quaternion.copy(source.quaternion);
  result.scale.copy(source.scale);
}

function createAnimationStubs(clips) {
  return clips.map((clip) => ({
    name: clip.name,
    duration: clip.duration,
    loop: true,
    tracks: [],
  }));
}

function isLegacyEditableRetroCharacter(object) {
  const recipe = object?.userData?.retroCharacterRecipe;
  return Boolean(
    object?.isObject3D
    && recipe
    && recipe.format === 'retrovisor-character'
    && object.userData?.nativeGltf !== true
    && object.userData?.compatibleRig !== COMPATIBLE_HUMANOID_RIG,
  );
}

/**
 * Shared target predicate for the GLB action. Avatar Forge is accepted only
 * when its actual standard rig metadata and semantic anchors are present.
 */
export function isEditableRetroCharacter(object) {
  return isLegacyEditableRetroCharacter(object) || isAvatarForgeHumanoidTarget(object);
}

export const isCompatibleHumanoidTarget = isEditableRetroCharacter;

/**
 * Bake a retro character into a native skinned copy and transfer the native
 * quaternion clips from a validated Meshy source. The two inputs remain
 * untouched and no source geometry/material is disposed.
 */
export function createCompatibleHumanoidCopy(retroGroup, sourceGroup, options = {}) {
  const avatarTarget = isAvatarForgeHumanoidTarget(retroGroup);
  const legacyTarget = isLegacyEditableRetroCharacter(retroGroup);
  if (!legacyTarget && !avatarTarget) {
    if (retroGroup?.userData?.avatarRecipe) {
      const missing = avatarForgeTargetMissingPivots(retroGroup).missing;
      throw adapterError(
        'el Avatar Forge debe ser HUMANOID_STANDARD y tener anclas semánticas completas'
        + (missing.length ? '; faltan [' + missing.join(', ') + ']' : ''),
      );
    }
    throw adapterError('el objetivo debe ser la raíz de un personaje retro editable');
  }
  const info = inspectCompatibleHumanoidSource(sourceGroup);
  const working = neutralClone(retroGroup);
  const pivots = findNamedPivots(working, { avatar: avatarTarget });
  if (avatarTarget) alignAvatarToAnimationBasis(working, pivots);
  normalizeCloneArms(working, pivots);
  const bounds = collectBounds(working);
  const anchors = collectTargetAnchors(working, pivots, bounds);
  const positions = buildTargetPositions(info, anchors);
  const result = new THREE.Group();
  result.name = options.name || `${retroGroup.name || 'Retro character'} • compatible rig`;
  result.userData = {
    ...clonePlain(retroGroup.userData || {}),
    nativeGltf: true,
    compatibleRig: COMPATIBLE_HUMANOID_RIG,
    compatibleRigVersion: COMPATIBLE_HUMANOID_VERSION,
    sourceRetroCharacterRecipe: avatarTarget
      ? null
      : clonePlain(retroGroup.userData?.retroCharacterRecipe || null),
    sourceAvatarRecipe: avatarTarget
      ? clonePlain(retroGroup.userData?.avatarRecipe || null)
      : null,
    sourceCompatibleTargetKind: avatarTarget ? 'avatar-forge' : 'retro-character',
    humanoidRigMode: 'native-compatible',
  };
  result.userData.name = result.name;
  delete result.userData.retroCharacterRecipe;
  delete result.userData.avatarRecipe;
  const { bonesByName, orderedBones } = buildTargetBones(result, info, positions);
  const baked = bakeRetroGeometry(working, pivots, anchors, positions);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const skinnedMesh = new THREE.SkinnedMesh(baked.geometry, material);
  skinnedMesh.name = `${result.name} • mesh`;
  skinnedMesh.userData.compatibleRig = COMPATIBLE_HUMANOID_RIG;
  const skeleton = new THREE.Skeleton(orderedBones);
  result.add(skinnedMesh);
  result.updateMatrixWorld(true);
  skinnedMesh.bind(skeleton, new THREE.Matrix4());
  skeleton.calculateInverses();
  const headSurfaceCount = attachHeadSurfaceMeshes(bonesByName.get('Head'), baked.headSurfaceMeshes);
  result.updateMatrixWorld(true);
  const clips = buildCompatibleClips(
    info,
    positions.get('Hips'),
    Math.max(positions.get('Hips').y - baked.minY, EPSILON),
    options,
  );
  const gltfAnimations = clips.map((clip) => clonePlain(THREE.AnimationClip.toJSON(clip)));
  const animationStubs = createAnimationStubs(clips);
  result.userData.gltfAnimations = gltfAnimations;
  result.userData.animationClips = clips;
  result.userData.animations = animationStubs;
  result.userData.skeletonId = COMPATIBLE_HUMANOID_RIG;
  result.userData.boneNames = orderedBones.map((bone) => bone.name);
  result.userData.geometryStats = {
    triangleCount: baked.triangleCount,
    height: baked.height,
    sourceMeshCount: baked.meshCount,
    headSurfaceCount,
  };
  // Keep native clips in userData, matching the GLB import/persistence path.
  // Object3D.animations must not contain the editor's plain timeline stubs.
  copyRootTransform(result, retroGroup);
  if (avatarTarget) restoreAvatarSceneBasis(result);
  result.updateMatrixWorld(true);
  return result;
}
