import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { stopAnimation, playAnimation } from './animation.js';
import { importAnimationToGroup } from './animation-import.js';
import { getSkeletonById } from './skeleton-registry.js';
import { buildBoneToTargetMap } from './mesh-animation-translation.js';
import { selectMesh } from '../viewport/selection.js';
import { centerCameraOnSelected } from '../viewport/actions.js';

const RIG_PREVIEW_BONE_GEO = new THREE.SphereGeometry(0.12, 6, 4);
const RIG_PREVIEW_BONE_MAT = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  wireframe: true,
  depthTest: false,
});
const RIG_PREVIEW_LINE_MAT = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  depthTest: false,
});

const rigPreview = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  helperGroup: null,
  boneEntries: [],
  lineEntries: [],
  targetMap: {},
  nodeLookup: new Map(),
  skeleton: null,
  group: null,
  frameId: 0,
};

function getRigPreviewDom() {
  return {
    viewport: document.getElementById('anim-mode-rig-viewport'),
    canvas: document.getElementById('anim-mode-rig-canvas'),
    empty: document.getElementById('anim-mode-rig-empty'),
    status: document.getElementById('anim-mode-rig-status'),
  };
}

function setRigPreviewMessage(message, mode = 'idle') {
  const { empty, status } = getRigPreviewDom();
  if (status) {
    status.textContent = message;
    status.className = mode === 'live'
      ? 'text-[#00ff88] text-[8px]'
      : mode === 'error'
        ? 'text-rose-300 text-[8px]'
        : 'text-zinc-500 text-[8px]';
  }
  if (empty) {
    empty.classList.toggle('hidden', mode === 'live');
    if (mode !== 'live') {
      empty.textContent = message;
    }
  }
}

function resizeRigPreviewViewport() {
  const { viewport, canvas } = getRigPreviewDom();
  if (!viewport || !canvas || !rigPreview.renderer || !rigPreview.camera) return false;

  const width = Math.max(viewport.clientWidth || 0, 1);
  const height = Math.max(viewport.clientHeight || 0, 1);
  const resized = canvas.width !== width || canvas.height !== height;

  if (resized) {
    canvas.width = width;
    canvas.height = height;
    rigPreview.renderer.setSize(width, height, false);
    rigPreview.camera.aspect = width / height;
    rigPreview.camera.updateProjectionMatrix();
  }

  return resized;
}

function frameRigPreviewCamera(object3D, fallbackCenter = new THREE.Vector3(0, 1.8, 0)) {
  if (!rigPreview.camera || !rigPreview.controls) return;

  const box = object3D ? new THREE.Box3().setFromObject(object3D) : null;
  if (!box || box.isEmpty()) {
    rigPreview.controls.target.copy(fallbackCenter);
    rigPreview.camera.position.copy(fallbackCenter).add(new THREE.Vector3(6, 5, 8));
    rigPreview.camera.lookAt(fallbackCenter);
    rigPreview.controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(rigPreview.camera.fov / 2)));
  const fitWidth = fitHeight / Math.max(rigPreview.camera.aspect, 0.1);
  const distance = Math.max(fitHeight, fitWidth, 4) * 1.35;
  const offset = new THREE.Vector3(1.05, 0.8, 1.1).normalize().multiplyScalar(distance);

  rigPreview.controls.target.copy(center);
  rigPreview.camera.position.copy(center).add(offset);
  rigPreview.camera.lookAt(center);
  rigPreview.controls.update();
}

function ensureRigPreviewRuntime() {
  const { canvas } = getRigPreviewDom();
  if (!canvas || rigPreview.renderer) return;

  rigPreview.scene = new THREE.Scene();
  rigPreview.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  rigPreview.scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x333333));

  rigPreview.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  rigPreview.camera.position.set(8, 6, 10);

  rigPreview.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  rigPreview.renderer.setSize(1, 1, false);

  rigPreview.controls = new OrbitControls(rigPreview.camera, canvas);
  rigPreview.controls.enableDamping = true;

  resizeRigPreviewViewport();
}

function disposeRigPreviewHelper() {
  if (rigPreview.helperGroup && rigPreview.scene) {
    rigPreview.scene.remove(rigPreview.helperGroup);
  }
  rigPreview.helperGroup = null;
  rigPreview.boneEntries = [];
  rigPreview.lineEntries = [];
  rigPreview.targetMap = {};
  rigPreview.nodeLookup = new Map();
  rigPreview.skeleton = null;
  rigPreview.group = null;
}

function disposeRigPreviewRuntime() {
  if (rigPreview.frameId) {
    cancelAnimationFrame(rigPreview.frameId);
    rigPreview.frameId = 0;
  }
  disposeRigPreviewHelper();
  rigPreview.controls?.dispose?.();
  rigPreview.renderer?.dispose?.();
  rigPreview.renderer = null;
  rigPreview.scene = null;
  rigPreview.camera = null;
  rigPreview.controls = null;
}

function buildNamedNodeLookup(group) {
  const lookup = new Map();
  group?.traverse((node) => {
    const name = String(node?.userData?.name || node?.name || '').trim();
    if (name && !lookup.has(name)) {
      lookup.set(name, node);
    }
  });
  return lookup;
}

function computeSkeletonWorldPositions(skeleton) {
  const boneLookup = new Map((skeleton?.bones || []).map((bone) => [bone.name, bone]));
  const result = new Map();

  function resolveBonePosition(name) {
    if (result.has(name)) {
      return result.get(name).clone();
    }

    const bone = boneLookup.get(name);
    if (!bone) return null;

    const position = new THREE.Vector3(...(bone.position || [0, 0, 0]));
    if (bone.parent) {
      const parentPosition = resolveBonePosition(bone.parent);
      if (parentPosition) {
        position.add(parentPosition);
      }
    }

    result.set(name, position.clone());
    return position;
  }

  (skeleton?.bones || []).forEach((bone) => resolveBonePosition(bone.name));
  return result;
}

function buildRigPreviewHelper(skeleton, restWorldPositions) {
  const helperGroup = new THREE.Group();
  const boneEntries = [];
  const lineEntries = [];
  const entryLookup = new Map();

  (skeleton?.bones || []).forEach((bone) => {
    const node = new THREE.Group();
    node.name = bone.name;
    node.userData.name = bone.name;

    const sphere = new THREE.Mesh(RIG_PREVIEW_BONE_GEO, RIG_PREVIEW_BONE_MAT.clone());
    sphere.renderOrder = 999;
    node.add(sphere);

    const restPosition = restWorldPositions.get(bone.name)?.clone() || new THREE.Vector3();
    node.position.copy(restPosition);
    helperGroup.add(node);

    const entry = { bone, node, sphere, restPosition };
    boneEntries.push(entry);
    entryLookup.set(bone.name, entry);
  });

  (skeleton?.bones || []).forEach((bone) => {
    if (!bone.parent) return;

    const childEntry = entryLookup.get(bone.name);
    const parentEntry = entryLookup.get(bone.parent);
    if (!childEntry || !parentEntry) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      parentEntry.node.position.clone(),
      childEntry.node.position.clone(),
    ]);
    const line = new THREE.Line(geometry, RIG_PREVIEW_LINE_MAT.clone());
    line.renderOrder = 998;
    helperGroup.add(line);
    lineEntries.push({ parentEntry, childEntry, line });
  });

  return { helperGroup, boneEntries, lineEntries };
}

function updateRigPreviewPose() {
  if (!rigPreview.group || !rigPreview.helperGroup) return;

  const worldPosition = new THREE.Vector3();
  rigPreview.group.updateWorldMatrix(true, true);

  rigPreview.boneEntries.forEach((entry) => {
    const boneName = entry.bone.name;
    const targetName = rigPreview.targetMap[boneName];
    const targetNode = targetName ? rigPreview.nodeLookup.get(targetName) : null;

    if (targetNode) {
      targetNode.getWorldPosition(worldPosition);
      rigPreview.group.worldToLocal(worldPosition);
      entry.node.position.copy(worldPosition);
      entry.node.visible = true;
      return;
    }

    entry.node.position.copy(entry.restPosition);
    entry.node.visible = true;
  });

  rigPreview.lineEntries.forEach(({ parentEntry, childEntry, line }) => {
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, parentEntry.node.position.x, parentEntry.node.position.y, parentEntry.node.position.z);
    positions.setXYZ(1, childEntry.node.position.x, childEntry.node.position.y, childEntry.node.position.z);
    positions.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.visible = parentEntry.node.visible && childEntry.node.visible;
  });
}

function startRigPreviewLoop() {
  if (rigPreview.frameId) return;

  const animate = () => {
    if (!state.animationMode || !rigPreview.renderer || !rigPreview.scene || !rigPreview.camera) {
      rigPreview.frameId = 0;
      return;
    }

    rigPreview.frameId = requestAnimationFrame(animate);
    resizeRigPreviewViewport();
    updateRigPreviewPose();
    rigPreview.controls?.update();
    rigPreview.renderer.render(rigPreview.scene, rigPreview.camera);
  };

  animate();
}

function refreshRigPreview(group = state.animationModeObject) {
  ensureRigPreviewRuntime();
  disposeRigPreviewHelper();

  if (!group?.isGroup) {
    setRigPreviewMessage('Select a group to preview its rig.', 'idle');
    return;
  }

  const skeletonId = group.userData?.skeletonId || null;
  const skeleton = skeletonId ? getSkeletonById(skeletonId) : null;
  if (!skeleton?.bones?.length) {
    setRigPreviewMessage('This group has no skeleton assigned.', 'error');
    return;
  }

  const restWorldPositions = computeSkeletonWorldPositions(skeleton);
  const { helperGroup, boneEntries, lineEntries } = buildRigPreviewHelper(skeleton, restWorldPositions);
  const slotMap = group.userData?.slotMap || {};
  const slotBindings = group.userData?.slotBindings || skeleton.defaultBindings || {};

  rigPreview.group = group;
  rigPreview.skeleton = skeleton;
  rigPreview.targetMap = buildBoneToTargetMap(group, slotMap, slotBindings);
  rigPreview.nodeLookup = buildNamedNodeLookup(group);
  rigPreview.helperGroup = helperGroup;
  rigPreview.boneEntries = boneEntries;
  rigPreview.lineEntries = lineEntries;
  rigPreview.scene.add(helperGroup);

  updateRigPreviewPose();
  frameRigPreviewCamera(helperGroup);
  setRigPreviewMessage('LIVE', 'live');
  startRigPreviewLoop();
}

export function showTimelineForGroup(group) {
  const timeline = document.getElementById('animation-timeline');
  if (!timeline) return;
  if (!group || !group.userData?.animationClips?.length) {
    timeline.classList.add('hidden');
    return;
  }
  timeline.classList.remove('hidden');
  const select = document.getElementById('anim-select');
  if (select) {
    select.innerHTML = '';
    group.userData.animations.forEach((anim, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = anim.name || `Anim ${i + 1}`;
      select.appendChild(option);
    });
  }
}

export function getAnimGroup() {
  return state.animationMode ? state.animationModeObject : state.selectedMesh;
}

export function getAnimSelectIdx() {
  const select = document.getElementById('anim-select');
  return select ? parseInt(select.value, 10) || 0 : 0;
}

export function playAnim() {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
}

export function stopAnim() {
  stopAnimation();
}

export function onAnimSelectChange() {
  if (!state.animationPlaying) return;
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
}

export function enterAnimationMode() {
  const object = state.selectedMesh;
  if (!object || !object.isGroup) {
    showToast(t('selectGroupForAnimMode'));
    return;
  }

  stopAnimation();
  state.animationMode = true;
  state.animationModeObject = object;

  state.userObjects.children.forEach((child) => {
    if (child !== object) child.visible = false;
  });

  selectMesh(object);
  centerCameraOnSelected();

  const objectName = object.userData.name || 'Grupo';
  document.getElementById('left-panel')?.classList.add('hidden');
  document.getElementById('properties-panel')?.classList.add('hidden');
  document.getElementById('anim-mode-rig-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-banner')?.classList.remove('hidden');
  document.getElementById('anim-mode-obj-name').textContent = objectName;
  document.getElementById('anim-mode-banner-name').textContent = objectName;

  refreshAnimationList();
  showTimelineForGroup(object);
  refreshRigPreview(object);
  showToast(t('animModeLabel') + (object.userData.name || 'Group'));
}

export function exitAnimationMode() {
  if (!state.animationMode) return;
  stopAnimation();

  state.userObjects.children.forEach((child) => {
    child.visible = true;
  });

  state.animationMode = false;
  state.animationModeObject = null;

  document.getElementById('left-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-rig-panel')?.classList.add('hidden');
  document.getElementById('anim-mode-panel')?.classList.add('hidden');
  document.getElementById('anim-mode-banner')?.classList.add('hidden');
  disposeRigPreviewRuntime();

  if (state.selectedMesh) {
    document.getElementById('properties-panel')?.classList.remove('hidden');
    showTimelineForGroup(state.selectedMesh);
  }

  showToast(t('backToScene'));
}

export function refreshAnimationList() {
  const list = document.getElementById('anim-mode-list');
  if (!list) return;
  list.replaceChildren();

  const object = state.animationModeObject;
  if (!object) return;

  const animations = object.userData.animations || [];
  if (animations.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-zinc-500 text-[10px]';
    empty.textContent = t('noAnimations');
    list.appendChild(empty);
    return;
  }

  animations.forEach((anim, index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded';

    const name = document.createElement('span');
    name.className = 'flex-1 text-[10px] text-white truncate';
    name.textContent = anim.name || `Anim ${index + 1}`;

    const duration = document.createElement('span');
    duration.className = 'text-[10px] text-zinc-400';
    duration.textContent = anim.duration ? `${anim.duration.toFixed(1)}s` : '';

    const tracks = document.createElement('span');
    tracks.className = 'text-[10px] text-zinc-500';
    tracks.textContent = anim.tracks ? `${anim.tracks.length}t` : '';

    const playButton = document.createElement('button');
    playButton.className = 'retro-button bg-[#ffcc00] text-black px-2 py-0.5 text-[10px] font-bold';
    playButton.textContent = 'PLAY';
    playButton.addEventListener('click', () => animModePlayClip(index));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'retro-button bg-red-600 text-white px-2 py-0.5 text-[10px]';
    deleteButton.textContent = 'X';
    deleteButton.addEventListener('click', () => animModeDeleteClip(index));

    row.append(name, duration, tracks, playButton, deleteButton);
    list.appendChild(row);
  });
}

export function animModePlayClip(index) {
  const object = state.animationModeObject;
  if (!object || !object.userData?.animationClips?.[index]) return;
  const select = document.getElementById('anim-select');
  if (select) select.value = index;
  stopAnimation();
  playAnimation(object, index);
}

export function animModeDeleteClip(index) {
  const object = state.animationModeObject;
  if (!object) return;
  stopAnimation();
  if (object.userData.animations) object.userData.animations.splice(index, 1);
  if (object.userData.animationClips) object.userData.animationClips.splice(index, 1);
  refreshAnimationList();
  showTimelineForGroup(object);
  refreshRigPreview(object);
  showToast(t('animDeleted'));
}

export function animModeImportAnim() {
  const text = document.getElementById('anim-mode-textarea')?.value?.trim();
  const errorElement = document.getElementById('anim-mode-import-error');
  if (!text) {
    if (errorElement) errorElement.textContent = t('pasteAnimJson');
    return;
  }

  const object = state.animationModeObject;
  if (!object) {
    if (errorElement) errorElement.textContent = t('noActiveObject');
    return;
  }

  const result = importAnimationToGroup(text, object);
  if (result.success) {
    document.getElementById('anim-mode-textarea').value = '';
    if (errorElement) errorElement.textContent = result.warnings ? result.warnings.join(' | ') : '';
    refreshAnimationList();
    showTimelineForGroup(object);
    refreshRigPreview(object);
    return;
  }

  if (errorElement) errorElement.textContent = result.error;
}
